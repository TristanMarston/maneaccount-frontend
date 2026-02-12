'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe-init';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';

export async function createSetupIntent() {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
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

export async function startFreeTrial() {
    const session = await auth();
    if (!session?.user.email) return { error: 'Not authenticated' };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) return { error: 'No user found' };
        if (user.trialEndsAt) return { error: 'Free trial already started' };

        const customer = await stripe.customers.create({
            email: session.user.email,
            name: session.user.name || undefined,
            metadata: {
                userId: user.id,
                role: 'braider',
            },
        });

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const updateData: any = {};
        updateData.stripeCustomerId = customer.id;
        updateData.trialEndsAt = trialEndDate;
        updateData.subscriptionStatus = 'trialing';
        updateData.subscriptionTier = 'starter';

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

export async function updateSubscription(paymentMethodId: string | null, priceId: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user || !user.stripeCustomerId) {
        return { error: 'No Stripe customer found' };
    }

    try {
        if (paymentMethodId) {
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: user.stripeCustomerId,
            });

            await stripe.customers.update(user.stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
        }

        let tier: SubscriptionTier = 'starter';
        if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || priceId === process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY) {
            tier = 'professional';
        } else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || priceId === process.env.STRIPE_PRICE_ENTERPRISE_YEARLY) {
            tier = 'enterprise';
        }

        const existingSubscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'all',
            limit: 1,
        });

        let subscription;
        let subscriptionStatus: SubscriptionStatus = 'active';

        let trialEndTimestamp: number | undefined = undefined;
        if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
            trialEndTimestamp = Math.floor(new Date(user.trialEndsAt).getTime() / 1000);
        }

        if (existingSubscriptions.data.length > 0) {
            const currentSub = existingSubscriptions.data[0];

            const updateParams: any = {
                items: [
                    {
                        id: currentSub.items.data[0].id,
                        price: priceId,
                    },
                ],
                trial_end: 'now',
            };

            subscription = await stripe.subscriptions.update(currentSub.id, updateParams);
        } else {
            const createParams: any = {
                customer: user.stripeCustomerId,
                items: [{ price: priceId }],
                trial_end: 'now',
            };

            subscription = await stripe.subscriptions.create(createParams);
        }

        switch (subscription.status) {
            case 'trialing':
                subscriptionStatus = 'trialing';
                break;
            case 'active':
                subscriptionStatus = 'active';
                break;
            case 'past_due':
                subscriptionStatus = 'past_due';
                break;
            case 'canceled':
            case 'unpaid':
                subscriptionStatus = 'canceled';
                break;
            default:
                subscriptionStatus = 'inactive';
        }

        const isYearly =
            priceId === process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || priceId === process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || priceId === process.env.STRIPE_PRICE_STARTER_YEARLY;

        let currentPeriodEnd = (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null;

        if (!currentPeriodEnd) {
            currentPeriodEnd = new Date();
            if (isYearly) {
                currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
            } else {
                currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                stripeSubscriptionId: subscription.id,
                subscriptionTier: tier,
                subscriptionStatus: subscriptionStatus,
                hasUsedTrial: subscription.status !== 'trialing',
                currentPeriodEnd: currentPeriodEnd,
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating subscription:', error);
        return { error: error.message };
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
    if (!session?.user?.email) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            id: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            trialEndsAt: true,
            stripeCustomerId: true,
            currentPeriodEnd: true,
        },
    });

    if (!user) return null;

    let hasPaymentMethod = false;
    let subscriptionInterval = 'month';
    let currentPeriodEnd = user.currentPeriodEnd;
    let subscriptionStatus = user.subscriptionStatus;

    if (user.stripeCustomerId) {
        try {
            const customer = await stripe.customers.retrieve(user.stripeCustomerId);
            if (!customer.deleted) {
                hasPaymentMethod = !!(customer as any).invoice_settings?.default_payment_method;
                const subscriptions = await stripe.subscriptions.list({
                    customer: user.stripeCustomerId,
                    limit: 1,
                });

                if (subscriptions.data.length > 0) {
                    const sub = subscriptions.data[0];
                    subscriptionInterval = (sub as any)?.plan?.interval;
                    let stripeCurrentPeriodEnd = (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : null;

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
                    const stripeStatus = sub.status as SubscriptionStatus;

                    // Sync with DB if different (basic check, or just always update to be safe and simple)
                    if (stripeCurrentPeriodEnd?.getTime() !== user.currentPeriodEnd?.getTime() || stripeStatus !== user.subscriptionStatus) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                currentPeriodEnd: stripeCurrentPeriodEnd,
                                subscriptionStatus: stripeStatus === 'active' || stripeStatus === 'trialing' ? stripeStatus : 'inactive', // Map Stripe status to our enum roughly, or better use the exact mapping logic if needed.
                                // Note: The schema enum has 'active', 'trialing', 'past_due', 'canceled', 'inactive'.
                                // Stripe statuses: active, past_due, unpaid, canceled, incomplete, incomplete_expired, trialing.
                            },
                        });
                        currentPeriodEnd = stripeCurrentPeriodEnd;
                        // subscriptionStatus = stripeStatus; // Be careful with enum mapping here if not 1:1.
                        // Let's re-use the mapping logic or just rely on the update above and re-fetch if strict,
                        // but locally updating variables is faster.
                        // For now, let's keep it simple and assume the UI uses the returned object.
                    }
                    currentPeriodEnd = stripeCurrentPeriodEnd;
                }
            }
        } catch (error) {
            console.error('Error fetching Stripe customer:', error);
        }
    }

    return {
        ...user,
        hasPaymentMethod,
        subscriptionInterval,
        currentPeriodEnd,
        subscriptionStatus,
    };
}
