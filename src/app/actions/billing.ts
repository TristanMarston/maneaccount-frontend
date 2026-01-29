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
        updateData.subscriptionTier = 'enterprise';

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
        // If a payment method is provided, attach it and set as default
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

        // Determine subscription tier from priceId
        let tier: SubscriptionTier = 'starter';
        if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || priceId === process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY) {
            tier = 'professional';
        } else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || priceId === process.env.STRIPE_PRICE_ENTERPRISE_YEARLY) {
            tier = 'enterprise';
        }

        // Check for existing subscription
        const existingSubscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'all',
            limit: 1,
        });

        let subscription;
        let subscriptionStatus: SubscriptionStatus = 'active';

        // Calculate trial end unix timestamp if trial is still valid
        let trialEndTimestamp: number | undefined = undefined;
        if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
            trialEndTimestamp = Math.floor(new Date(user.trialEndsAt).getTime() / 1000);
        }

        if (existingSubscriptions.data.length > 0) {
            // Update existing subscription
            const currentSub = existingSubscriptions.data[0];

            // If we are still in trial, we keep the trial end date
            // If the user is upgrading, we might want to respect the trial

            const updateParams: any = {
                items: [
                    {
                        id: currentSub.items.data[0].id,
                        price: priceId,
                    },
                ],
            };

            if (trialEndTimestamp) {
                updateParams.trial_end = trialEndTimestamp;
            } else {
                updateParams.trial_end = 'now'; // End trial if expired or not applicable
            }

            subscription = await stripe.subscriptions.update(currentSub.id, updateParams);
        } else {
            // Create new subscription
            const createParams: any = {
                customer: user.stripeCustomerId,
                items: [{ price: priceId }],
            };

            if (trialEndTimestamp) {
                createParams.trial_end = trialEndTimestamp;
            }

            subscription = await stripe.subscriptions.create(createParams);
        }

        // Map Stripe status to Prisma status
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

        await prisma.user.update({
            where: { id: user.id },
            data: {
                stripeSubscriptionId: subscription.id,
                subscriptionTier: tier,
                subscriptionStatus: subscriptionStatus,
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
            subscriptionTier: true,
            subscriptionStatus: true,
            trialEndsAt: true,
            stripeCustomerId: true,
        },
    });

    if (!user) return null;

    let hasPaymentMethod = false;
    let subscriptionInterval = 'month';
    if (user.stripeCustomerId) {
        try {
            const customer = await stripe.customers.retrieve(user.stripeCustomerId);
            if (!customer.deleted) {
                hasPaymentMethod = !!(customer as any).invoice_settings?.default_payment_method;
                const subscriptions = await stripe.subscriptions.list({
                    customer: user.stripeCustomerId,
                });
                subscriptionInterval = (subscriptions.data[0] as any)?.plan?.interval;
            }
        } catch (error) {
            console.error('Error fetching Stripe customer:', error);
        }
    }

    return {
        ...user,
        hasPaymentMethod,
        subscriptionInterval,
    };
}
