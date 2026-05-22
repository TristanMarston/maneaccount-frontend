'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe-init';
import Stripe from 'stripe';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { addDays, format, isAfter, isBefore } from 'date-fns';
import { revalidatePath } from 'next/cache';

export interface SubscriptionModalDetails {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    interval: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    paymentMethod: {
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
    } | null;
    invoiceHistory: {
        id: string;
        amountPaid: number;
        currency: string;
        status: string | null;
        created: string;
        hostedInvoiceUrl: string | null;
    }[];
    upcomingInvoice: {
        amountDue: number;
        currency: string;
        dueDate: string | null;
    } | null;
}

type UpdateSubscriptionResult =
    | { success: true; requiresAction?: false; clientSecret?: never }
    | { success: true; requiresAction: true; clientSecret: string }
    | { success: false; error: string };

type UpdateDefaultPaymentMethodResult =
    | { success: true; requiresAction?: false; clientSecret?: never }
    | { success: true; requiresAction: true; clientSecret: string }
    | { success: false; error: string };

const SUBSCRIPTION_INVOICE_EXPANDS = ['latest_invoice.confirmation_secret'] as const;
const SUBSCRIPTION_LIST_INVOICE_EXPANDS = ['data.latest_invoice.confirmation_secret'] as const;

function mapStripeSubscriptionStatus(status: string, hasUsedTrial: boolean): SubscriptionStatus {
    switch (status) {
        case 'trialing':
            return hasUsedTrial ? 'active' : 'trialing';
        case 'active':
            return 'active';
        case 'past_due':
        case 'incomplete':
            return 'past_due';
        case 'canceled':
        case 'unpaid':
            return 'canceled';
        default:
            return 'inactive';
    }
}

function mapPriceIdToTier(priceId: string): SubscriptionTier {
    if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || priceId === process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY) {
        return 'professional';
    }

    if (priceId === process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || priceId === process.env.STRIPE_PRICE_ENTERPRISE_YEARLY) {
        return 'enterprise';
    }

    return 'starter';
}

function getIntervalFromPriceId(priceId: string): 'month' | 'year' {
    if (priceId === process.env.STRIPE_PRICE_STARTER_YEARLY || priceId === process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || priceId === process.env.STRIPE_PRICE_ENTERPRISE_YEARLY) {
        return 'year';
    }

    return 'month';
}

function getSubscriptionInterval(subscription: Stripe.Subscription): 'month' | 'year' {
    const interval = subscription.items.data[0]?.price.recurring?.interval ?? (subscription as any)?.plan?.interval ?? 'month';
    return interval === 'year' ? 'year' : 'month';
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
    const rawCurrentPeriodEnd = (subscription as any).current_period_end;
    return rawCurrentPeriodEnd ? new Date(rawCurrentPeriodEnd * 1000) : null;
}

function inferHasUsedTrial(currentValue: boolean, stripeStatus: string, existingPeriodEnd: Date | null): boolean {
    return currentValue || stripeStatus !== 'trialing' || !!existingPeriodEnd;
}

async function getLatestInvoice(subscription: Stripe.Subscription): Promise<Stripe.Invoice | null> {
    const latestInvoice = subscription.latest_invoice;

    if (!latestInvoice) {
        return null;
    }

    if (typeof latestInvoice === 'string') {
        return await stripe.invoices.retrieve(latestInvoice, {
            expand: ['confirmation_secret', 'payments.data.payment.payment_intent'],
        });
    }

    const invoice = latestInvoice as Stripe.Invoice;
    const hasConfirmationSecret = !!invoice.confirmation_secret?.client_secret;
    if (hasConfirmationSecret && invoice.payments) {
        return invoice;
    }

    return await stripe.invoices.retrieve(invoice.id, {
        expand: ['confirmation_secret', 'payments.data.payment.payment_intent'],
    });
}

async function getInvoicePaymentIntentFromInvoice(invoice: Stripe.Invoice): Promise<Stripe.PaymentIntent | null> {
    const expandedPaymentIntent = invoice.payments?.data?.find(
        (invoicePayment) => invoicePayment.payment?.type === 'payment_intent' && !!invoicePayment.payment.payment_intent && typeof invoicePayment.payment.payment_intent !== 'string',
    )?.payment.payment_intent;

    if (expandedPaymentIntent && typeof expandedPaymentIntent !== 'string') {
        return expandedPaymentIntent;
    }

    const invoicePayments = await stripe.invoicePayments.list({
        invoice: invoice.id,
        payment: { type: 'payment_intent' },
        limit: 10,
        expand: ['data.payment.payment_intent'],
    });

    const fallbackPaymentIntent = invoicePayments.data.find(
        (invoicePayment) => invoicePayment.payment?.type === 'payment_intent' && !!invoicePayment.payment.payment_intent && typeof invoicePayment.payment.payment_intent !== 'string',
    )?.payment.payment_intent;

    return fallbackPaymentIntent && typeof fallbackPaymentIntent !== 'string' ? fallbackPaymentIntent : null;
}

function getInvoiceConfirmationClientSecretFromInvoice(invoice: Stripe.Invoice): string | null {
    const confirmationSecret = invoice.confirmation_secret;
    if (!confirmationSecret) return null;

    return confirmationSecret.client_secret ?? null;
}

async function getInvoicePaymentIntent(subscription: Stripe.Subscription): Promise<Stripe.PaymentIntent | null> {
    const latestInvoice = await getLatestInvoice(subscription);
    if (!latestInvoice) return null;

    return await getInvoicePaymentIntentFromInvoice(latestInvoice);
}

async function getInvoiceConfirmationClientSecret(subscription: Stripe.Subscription): Promise<string | null> {
    const latestInvoice = await getLatestInvoice(subscription);
    if (!latestInvoice) return null;

    return getInvoiceConfirmationClientSecretFromInvoice(latestInvoice);
}

async function setSubscriptionDefaultPaymentMethod(subscriptionId: string, paymentMethodId: string) {
    await stripe.subscriptions.update(subscriptionId, {
        default_payment_method: paymentMethodId,
    });
}

async function clearSubscriptionCancellation(subscriptionId: string, userId: string) {
    await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        metadata: {
            userId,
            role: 'braider',
        },
    });
}

async function getCurrentStripeSubscription(customerId: string) {
    const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 10,
        expand: [...SUBSCRIPTION_LIST_INVOICE_EXPANDS],
    });

    return (
        subscriptions.data.find((subscription) => subscription.status !== 'canceled' && subscription.status !== 'incomplete_expired') ??
        subscriptions.data.find((subscription) => subscription.status !== 'canceled') ??
        null
    );
}

async function ensurePaymentMethodForCustomer(paymentMethodId: string, customerId: string) {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const paymentMethodCustomer = typeof paymentMethod.customer === 'string' ? paymentMethod.customer : paymentMethod.customer?.id;

    if (!paymentMethodCustomer) {
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });
        return;
    }

    if (paymentMethodCustomer !== customerId) {
        throw new Error('This payment method belongs to a different customer.');
    }
}

export async function createSetupIntent() {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user || !user.stripeCustomerId) {
        return { error: 'No Stripe customer found' };
    }

    try {
        const setupIntent = await stripe.setupIntents.create({
            customer: user.stripeCustomerId,
            payment_method_types: ['card'],
        });

        return { clientSecret: setupIntent.client_secret };
    } catch (error: any) {
        console.error('Error creating setup intent:', error);
        return { error: error.message };
    }
}

export async function updateDefaultPaymentMethod(paymentMethodId: string): Promise<UpdateDefaultPaymentMethodResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user || !user.stripeCustomerId) {
        return { success: false, error: 'No Stripe customer found' };
    }

    try {
        await ensurePaymentMethodForCustomer(paymentMethodId, user.stripeCustomerId);

        await stripe.customers.update(user.stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        const currentSub = await getCurrentStripeSubscription(user.stripeCustomerId);
        if (currentSub) {
            await setSubscriptionDefaultPaymentMethod(currentSub.id, paymentMethodId);

            const latestInvoice = await getLatestInvoice(currentSub);
            if (latestInvoice && latestInvoice.status === 'open' && latestInvoice.collection_method === 'charge_automatically') {
                try {
                    const paidInvoice = await stripe.invoices.pay(latestInvoice.id, {
                        expand: ['confirmation_secret', 'payments.data.payment.payment_intent'],
                    });
                    const paymentIntent = await getInvoicePaymentIntentFromInvoice(paidInvoice);
                    const confirmationClientSecret = getInvoiceConfirmationClientSecretFromInvoice(paidInvoice);

                    if (paymentIntent?.status === 'requires_payment_method') {
                        return { success: false, error: 'Your new card was saved, but Stripe still declined the outstanding invoice. Please try a different card.' };
                    }

                    if (paymentIntent?.status === 'processing') {
                        return { success: false, error: 'Your new card was saved, but Stripe is still processing the outstanding invoice payment.' };
                    }

                    if (paymentIntent?.status === 'requires_action' || paymentIntent?.status === 'requires_confirmation') {
                        if (!confirmationClientSecret) {
                            return { success: false, error: 'Your new card was saved, but Stripe did not return a client secret for the outstanding invoice.' };
                        }

                        return {
                            success: true,
                            requiresAction: true,
                            clientSecret: confirmationClientSecret,
                        };
                    }
                } catch (invoiceError: any) {
                    console.error('Error retrying latest invoice after payment method update:', invoiceError);
                    return {
                        success: false,
                        error: invoiceError.message || 'Your card was updated, but Stripe could not retry the outstanding invoice automatically.',
                    };
                }
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error updating default payment method:', error);
        return { success: false, error: error.message };
    }
}

export async function startFreeTrial() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) return { error: 'No user found' };
        if (user.hasUsedTrial || (user.trialEndsAt && isAfter(new Date(), user.trialEndsAt))) return { error: 'Free trial already used' };
        if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing' || user.subscriptionStatus === 'past_due') {
            return { error: 'User already has a subscription or active trial' };
        }

        let stripeCustomerId = user.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email || undefined,
                name: session.user.name || undefined,
                metadata: {
                    userId: user.id,
                    role: 'braider',
                },
            });

            stripeCustomerId = customer.id;
        }

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const updateData: any = {};
        updateData.stripeCustomerId = stripeCustomerId;
        updateData.trialEndsAt = trialEndDate;
        updateData.subscriptionStatus = 'trialing';
        updateData.subscriptionTier = 'starter';
        updateData.cancelAtPeriodEnd = false;

        await prisma.user.update({
            where: { id: user.id },
            data: updateData,
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error starting free trial:', error);
        return { error: error.message };
    }
}

export async function updateSubscription(paymentMethodId: string | null, priceId: string): Promise<UpdateSubscriptionResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user || !user.stripeCustomerId) {
        return { success: false, error: 'No Stripe customer found' };
    }

    try {
        if (paymentMethodId) {
            await ensurePaymentMethodForCustomer(paymentMethodId, user.stripeCustomerId);

            await stripe.customers.update(user.stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
        }

        const tier = mapPriceIdToTier(priceId);
        const targetInterval = getIntervalFromPriceId(priceId);
        const currentSub = await getCurrentStripeSubscription(user.stripeCustomerId);
        const isTrialStillActive = !!user.trialEndsAt && isAfter(user.trialEndsAt, new Date());

        let subscription: Stripe.Subscription;
        let expectsImmediatePayment = false;
        let paymentIntent: Stripe.PaymentIntent | null = null;
        let confirmationClientSecret: string | null = null;

        if (currentSub) {
            if (!currentSub.items.data[0]) {
                return { success: false, error: 'No Stripe subscription item was found for this subscription.' };
            }

            const currentInterval = getSubscriptionInterval(currentSub);
            const currentPriceId = currentSub.items.data[0]?.price.id ?? '';
            const isPlanChange = currentInterval !== targetInterval || currentPriceId !== priceId;
            const needsPastDueRecovery = ['past_due', 'incomplete', 'unpaid'].includes(currentSub.status);
            const shouldInvoiceNow = currentSub.status === 'trialing' || isPlanChange;
            expectsImmediatePayment = shouldInvoiceNow || needsPastDueRecovery;

            if (paymentMethodId) {
                await setSubscriptionDefaultPaymentMethod(currentSub.id, paymentMethodId);
            }

            if (currentSub.cancel_at_period_end) {
                await clearSubscriptionCancellation(currentSub.id, user.id);
            }

            if (needsPastDueRecovery && !isPlanChange && currentSub.status !== 'trialing') {
                const latestInvoice = await getLatestInvoice(currentSub);

                if (!latestInvoice || latestInvoice.status !== 'open' || latestInvoice.collection_method !== 'charge_automatically') {
                    return {
                        success: false,
                        error: 'Your subscription needs payment recovery, but Stripe did not return an open invoice to retry.',
                    };
                }

                const paidInvoice = await stripe.invoices.pay(latestInvoice.id, {
                    expand: ['confirmation_secret', 'payments.data.payment.payment_intent'],
                });

                paymentIntent = await getInvoicePaymentIntentFromInvoice(paidInvoice);
                confirmationClientSecret = getInvoiceConfirmationClientSecretFromInvoice(paidInvoice);
                subscription = await stripe.subscriptions.retrieve(currentSub.id, {
                    expand: [...SUBSCRIPTION_INVOICE_EXPANDS],
                });
            } else {
                const updateParams: Stripe.SubscriptionUpdateParams & {
                    expand: string[];
                    payment_behavior?: 'pending_if_incomplete';
                    trial_end?: 'now';
                } = {
                    items: [
                        {
                            id: currentSub.items.data[0].id,
                            price: priceId,
                        },
                    ],
                    expand: [...SUBSCRIPTION_INVOICE_EXPANDS],
                };

                if (currentSub.status === 'trialing' || isTrialStillActive) {
                    updateParams.trial_end = 'now';
                }

                if (shouldInvoiceNow) {
                    updateParams.payment_behavior = 'pending_if_incomplete';
                    updateParams.proration_behavior = 'always_invoice';
                }

                subscription = await stripe.subscriptions.update(currentSub.id, updateParams as any);
            }
        } else {
            expectsImmediatePayment = true;
                const createParams: Stripe.SubscriptionCreateParams & {
                    expand: string[];
                } = {
                    customer: user.stripeCustomerId,
                    items: [{ price: priceId }],
                cancel_at_period_end: false,
                payment_behavior: 'default_incomplete',
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                },
                metadata: {
                    userId: user.id,
                    role: 'braider',
                },
                expand: [...SUBSCRIPTION_INVOICE_EXPANDS],
            };

            if (paymentMethodId) {
                createParams.default_payment_method = paymentMethodId;
            }

            if (isTrialStillActive) {
                createParams.trial_end = 'now';
            }

            subscription = await stripe.subscriptions.create(createParams as any);
        }

        if (!paymentIntent) {
            paymentIntent = await getInvoicePaymentIntent(subscription);
        }

        if (!confirmationClientSecret) {
            confirmationClientSecret = await getInvoiceConfirmationClientSecret(subscription);
        }

        const subscriptionStatus = mapStripeSubscriptionStatus(subscription.status, user.hasUsedTrial);
        const currentPeriodEnd = getCurrentPeriodEnd(subscription);

        const nextUserData: Record<string, unknown> = {
            stripeSubscriptionId: subscription.id,
            cancelAtPeriodEnd: false,
        };

        if (!paymentIntent && expectsImmediatePayment) {
            return {
                success: false,
                error: 'Stripe did not return a payable invoice for this subscription change. Please try again.',
            };
        }

        if (!paymentIntent || paymentIntent.status === 'succeeded') {
            nextUserData.subscriptionTier = tier;
            nextUserData.subscriptionStatus = subscriptionStatus;
            nextUserData.hasUsedTrial = subscriptionStatus !== 'trialing';
            nextUserData.currentPeriodEnd = currentPeriodEnd;
            nextUserData.trialEndsAt = subscriptionStatus === 'trialing' ? user.trialEndsAt : null;
        }

        await prisma.user.update({
            where: { id: user.id },
            data: nextUserData,
        });

        if (paymentIntent?.status === 'requires_payment_method') {
            return { success: false, error: 'Your card could not be charged. Please try a different payment method.' };
        }

        if (paymentIntent?.status === 'canceled') {
            return { success: false, error: 'Stripe canceled this payment attempt. Please try again with a different card.' };
        }

        if (paymentIntent?.status === 'processing') {
            return { success: false, error: 'Your payment is still processing. Please wait a moment and check your subscription status again.' };
        }

        if (paymentIntent?.status === 'requires_action' || paymentIntent?.status === 'requires_confirmation') {
            if (!confirmationClientSecret) {
                return { success: false, error: 'Stripe requires additional payment confirmation, but no client secret was returned.' };
            }

            return {
                success: true,
                requiresAction: true,
                clientSecret: confirmationClientSecret,
            };
        }

        if (paymentIntent && !['succeeded', 'requires_action', 'requires_confirmation'].includes(paymentIntent.status)) {
            return {
                success: false,
                error: `Payment was not completed. Stripe returned status "${paymentIntent.status}".`,
            };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error updating subscription:', error);
        return { success: false, error: error.message };
    }
}

export async function getPaymentConfig() {
    return {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        prices: {
            starter: {
                monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
                yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
            },
            professional: {
                monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
                yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY,
            },
            enterprise: {
                monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
                yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
            },
        },
    };
}

export async function getSubscriptionDetails() {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            trialEndsAt: true,
            hasUsedTrial: true,
            stripeCustomerId: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
        },
    });

    if (!user) return null;

    let hasPaymentMethod = false;
    let subscriptionInterval = 'month';
    let subscriptionTier: SubscriptionTier | null = null;
    let currentPeriodEnd = user.currentPeriodEnd;
    let subscriptionStatus = user.subscriptionStatus;
    let cancelAtPeriodEnd = user.cancelAtPeriodEnd;

    if (user.stripeCustomerId) {
        try {
            const customer = await stripe.customers.retrieve(user.stripeCustomerId);
            if (!customer.deleted) {
                hasPaymentMethod = !!(customer as any).invoice_settings?.default_payment_method;
                const sub = await getCurrentStripeSubscription(user.stripeCustomerId);

                if (sub) {
                    subscriptionInterval = getSubscriptionInterval(sub);
                    subscriptionTier = mapPriceIdToTier(sub.items.data[0]?.price.id ?? '');
                    let stripeCurrentPeriodEnd = getCurrentPeriodEnd(sub);

                    // Fallback to existing or calculate if totally missing from both Stripe and DB
                    if (!stripeCurrentPeriodEnd && !user.currentPeriodEnd) {
                        stripeCurrentPeriodEnd = new Date();
                        if (subscriptionInterval === 'year') {
                            stripeCurrentPeriodEnd.setFullYear(stripeCurrentPeriodEnd.getFullYear() + 1);
                        } else {
                            stripeCurrentPeriodEnd.setMonth(stripeCurrentPeriodEnd.getMonth() + 1);
                        }
                    } else if (!stripeCurrentPeriodEnd) {
                        stripeCurrentPeriodEnd = user.currentPeriodEnd;
                    }
                    const inferredHasUsedTrial = inferHasUsedTrial(user.hasUsedTrial, sub.status, user.currentPeriodEnd);
                    const mappedStripeStatus = mapStripeSubscriptionStatus(sub.status, inferredHasUsedTrial);
                    const stripeCancelAtPeriodEnd = (sub as any).cancel_at_period_end || false;

                    const stripePriceId = sub.items.data[0]?.price.id ?? '';
                    const stripeTier = mapPriceIdToTier(stripePriceId);

                    // Sync with DB if different (basic check, or just always update to be safe and simple)
                    if (
                        stripeCurrentPeriodEnd?.getTime() !== user.currentPeriodEnd?.getTime() ||
                        mappedStripeStatus !== user.subscriptionStatus ||
                        stripeCancelAtPeriodEnd !== user.cancelAtPeriodEnd ||
                        stripeTier !== user.subscriptionTier ||
                        inferredHasUsedTrial !== user.hasUsedTrial
                    ) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                currentPeriodEnd: stripeCurrentPeriodEnd,
                                subscriptionStatus: mappedStripeStatus,
                                cancelAtPeriodEnd: stripeCancelAtPeriodEnd,
                                subscriptionTier: stripeTier,
                                hasUsedTrial: inferredHasUsedTrial,
                                trialEndsAt: mappedStripeStatus === 'trialing' ? user.trialEndsAt : null,
                            },
                        });
                        currentPeriodEnd = stripeCurrentPeriodEnd;
                        subscriptionStatus = mappedStripeStatus;
                        cancelAtPeriodEnd = stripeCancelAtPeriodEnd;
                    }
                    currentPeriodEnd = stripeCurrentPeriodEnd;
                    subscriptionStatus = mappedStripeStatus;
                } else {
                    const hasTrialAccess = user.subscriptionStatus === 'trialing' && !!user.trialEndsAt && isAfter(user.trialEndsAt, new Date());

                    if (!hasTrialAccess && (user.subscriptionStatus !== 'inactive' || user.currentPeriodEnd || user.cancelAtPeriodEnd || user.stripeCustomerId)) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                stripeSubscriptionId: null,
                                subscriptionStatus: 'inactive',
                                currentPeriodEnd: null,
                                cancelAtPeriodEnd: false,
                            },
                        });
                        currentPeriodEnd = null;
                        subscriptionStatus = 'inactive';
                        cancelAtPeriodEnd = false;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching Stripe customer:', error);
        }
    }

    return {
        ...user,
        subscriptionTier: subscriptionTier || user.subscriptionTier,
        hasPaymentMethod,
        subscriptionInterval,
        currentPeriodEnd,
        subscriptionStatus,
        cancelAtPeriodEnd,
    };
}

export async function cancelSubscription() {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user || (!user.stripeSubscriptionId && !user.stripeCustomerId)) {
        return { error: 'No subscription found' };
    }

    try {
        if (user.stripeSubscriptionId) {
            await stripe.subscriptions.update(user.stripeSubscriptionId, {
                cancel_at_period_end: true,
            });
        } else if (user.stripeCustomerId) {
            const subscriptions = await stripe.subscriptions.list({
                customer: user.stripeCustomerId,
                limit: 1,
            });
            if (subscriptions.data.length > 0) {
                await stripe.subscriptions.update(subscriptions.data[0].id, {
                    cancel_at_period_end: true,
                });
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                cancelAtPeriodEnd: true,
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error canceling subscription:', error);
        return { error: error.message };
    }
}

export async function resumeSubscription() {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user || (!user.stripeSubscriptionId && !user.stripeCustomerId)) {
        return { error: 'No subscription found' };
    }

    try {
        if (user.stripeSubscriptionId) {
            await stripe.subscriptions.update(user.stripeSubscriptionId, {
                cancel_at_period_end: false,
            });
        } else if (user.stripeCustomerId) {
            const currentSub = await getCurrentStripeSubscription(user.stripeCustomerId);

            if (!currentSub) {
                return { error: 'No active subscription found to resume.' };
            }

            await stripe.subscriptions.update(currentSub.id, {
                cancel_at_period_end: false,
            });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                cancelAtPeriodEnd: false,
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error resuming subscription:', error);
        return { error: error.message };
    }
}

export async function getCoupons() {
    const session = await auth();
    if (!session?.user.email) return [];

    try {
        const coupons = await prisma.oneOffCoupon.findMany();
        return coupons;
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function addCoupon(formData: { code: string; startDate: Date | null; endDate: Date | null; days: number }) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Not authenticated' };

    const { code, startDate, endDate, days } = formData;
    if (!code || !endDate) return { error: 'Missing required fields' };

    try {
        await prisma.oneOffCoupon.create({ data: { code, startDate: startDate ? startDate : new Date(new Date().setHours(0, 0, 0, 0)), endDate, days } });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: 'Failed to create coupon' };
    }
}

export async function deleteCoupon(id: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Not authenticated.' };

    try {
        await prisma.oneOffCoupon.delete({ where: { id } });

        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: 'Unable to delete coupon.' };
    }
}

export async function editCoupon(data: any, id: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Not authenticated.' };

    try {
        if (!data.code && !data.startDate && !data.endDate && !data.days) return { error: 'No changes provided.' };
        const updateData: any = {};

        if (data.code && data.code.length > 0) updateData.code = data.code;
        if (data.startDate) updateData.startDate = data.startDate;
        if (data.endDate) updateData.endDate = data.endDate;
        if (data.days) updateData.days = data.days;

        await prisma.oneOffCoupon.update({ where: { id }, data: updateData });

        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: 'Unable to edit coupon.' };
    }
}

export async function applyOneOffCoupon(code: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { usedCoupons: true },
    });

    if (!user) return { error: 'User not found' };

    try {
        const coupon = (
            await prisma.oneOffCoupon.findMany({
                where: {
                    code: {
                        equals: code,
                        mode: 'insensitive',
                    },
                },
            })
        )[0];

        if (!coupon) return { error: 'Invalid coupon code.' };
        if (user.usedCoupons.some((c) => c.id === coupon.id)) return { error: 'Coupon code already used.' };

        const now = new Date();
        const startDate = coupon.startDate;
        const targetDate = addDays(coupon.endDate, 1);

        if (isAfter(now, targetDate)) return { error: 'This coupon has expired.' };
        if (isBefore(now, startDate)) return { error: 'Invalid coupon code.' };

        const daysToTarget = coupon.days && coupon.days !== 0 ? coupon.days : Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let newPeriodEnd = user.currentPeriodEnd || new Date();

        if (user.subscriptionStatus === 'active') {
            if (!user.stripeSubscriptionId) {
                return { error: 'No active Stripe subscription found for this customer.' };
            }

            const currentEndMs = user.currentPeriodEnd ? user.currentPeriodEnd.getTime() : now.getTime();
            const newTrialEndMs = currentEndMs + daysToTarget * 24 * 60 * 60 * 1000;
            const newTrialEndUnix = Math.floor(newTrialEndMs / 1000);
            newPeriodEnd = new Date(newTrialEndMs);

            await stripe.subscriptions.update(user.stripeSubscriptionId, {
                trial_end: newTrialEndUnix,
                proration_behavior: 'none',
            });
        } else if (user.subscriptionStatus === 'trialing') {
            const currentEndMs = user.trialEndsAt ? user.trialEndsAt.getTime() : now.getTime();
            newPeriodEnd = new Date(currentEndMs + daysToTarget * 24 * 60 * 60 * 1000);
        } else {
            return { error: 'This promo code can only be applied during an active subscription or trial.' };
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                currentPeriodEnd: user.subscriptionStatus === 'active' ? newPeriodEnd : user.currentPeriodEnd,
                trialEndsAt: user.subscriptionStatus === 'trialing' ? newPeriodEnd : user.trialEndsAt,
                hasUsedTrial: user.subscriptionStatus === 'active' ? true : user.hasUsedTrial,
                subscriptionStatus: user.subscriptionStatus === 'active' ? 'active' : user.subscriptionStatus,
                usedCoupons: {
                    connect: {
                        id: coupon.id,
                    },
                },
            },
        });

        return {
            success: true,
            message: `Coupon applied! Your ${user.subscriptionStatus === 'trialing' ? 'trial' : 'subscription'} has been extended ${coupon.days && coupon.days !== 0 ? `by ${coupon.days} days` : `until ${format(targetDate, 'PPP')} at the earliest`}.`,
        };
    } catch (err) {
        console.error(err);
        return { error: 'Unable to apply coupon code.' };
    }
}

export async function getSubscriptionModalDetails(): Promise<{ data: SubscriptionModalDetails | null; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { data: null, error: 'Not authenticated' };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                subscriptionTier: true,
                subscriptionStatus: true,
                trialEndsAt: true,
                currentPeriodEnd: true,
                cancelAtPeriodEnd: true,
                stripeCustomerId: true,
                stripeSubscriptionId: true,
            },
        });

        if (!user) return { data: null, error: 'User not found' };

        let paymentMethod: SubscriptionModalDetails['paymentMethod'] = null;
        let invoiceHistory: SubscriptionModalDetails['invoiceHistory'] = [];
        let upcomingInvoice: SubscriptionModalDetails['upcomingInvoice'] = null;
        let interval = 'month';
        let subscriptionId = '';

        if (user.stripeCustomerId) {
            // Fetch payment method
            try {
                const customer = await stripe.customers.retrieve(user.stripeCustomerId);
                if (!customer.deleted) {
                    const defaultPmId = (customer as any).invoice_settings?.default_payment_method;
                    if (defaultPmId) {
                        const pm = await stripe.paymentMethods.retrieve(defaultPmId);
                        if (pm.card) {
                            paymentMethod = {
                                brand: pm.card.brand,
                                last4: pm.card.last4,
                                expMonth: pm.card.exp_month,
                                expYear: pm.card.exp_year,
                            };
                        }
                    }
                }
            } catch (e) {
                console.error('Error fetching payment method:', e);
            }

            // Fetch subscription interval
            try {
                const subscription = await getCurrentStripeSubscription(user.stripeCustomerId);
                subscriptionId = subscription?.id ?? '';
                if (subscription) {
                    interval = getSubscriptionInterval(subscription);
                }
            } catch (e) {
                console.error('Error fetching subscription interval:', e);
            }

            // Fetch recent invoices
            try {
                const invoices = await stripe.invoices.list({
                    customer: user.stripeCustomerId,
                    limit: 5,
                });
                invoiceHistory = invoices.data.map((inv) => ({
                    id: inv.id,
                    amountPaid: inv.amount_paid,
                    currency: inv.currency,
                    status: inv.status,
                    created: new Date(inv.created * 1000).toISOString(),
                    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
                }));
            } catch (e) {
                console.error('Error fetching invoices:', e);
            }

            // Fetch upcoming invoice
            if (subscriptionId && user.subscriptionStatus === 'active') {
                try {
                    const upcoming = await stripe.invoices.createPreview({
                        customer: user.stripeCustomerId,
                        subscription: subscriptionId,
                    });
                    upcomingInvoice = {
                        amountDue: upcoming.amount_due,
                        currency: upcoming.currency,
                        dueDate: upcoming.due_date ? new Date(upcoming.due_date * 1000).toISOString() : null,
                    };
                } catch {
                    // No upcoming invoice is fine (e.g., canceled)
                }
            }
        }

        return {
            data: {
                tier: user.subscriptionTier,
                status: user.subscriptionStatus,
                interval,
                trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
                currentPeriodEnd: user.currentPeriodEnd?.toISOString() ?? null,
                cancelAtPeriodEnd: user.cancelAtPeriodEnd,
                paymentMethod,
                invoiceHistory,
                upcomingInvoice,
            },
        };
    } catch (err: any) {
        console.error('Error fetching subscription modal details:', err);
        return { data: null, error: err.message || 'Failed to fetch subscription details' };
    }
}
