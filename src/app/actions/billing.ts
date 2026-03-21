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
            cancelAtPeriodEnd: true,
        },
    });

    if (!user) return null;

    let hasPaymentMethod = false;
    let subscriptionInterval = 'month';
    let currentPeriodEnd = user.currentPeriodEnd;
    let subscriptionStatus = user.subscriptionStatus;
    let cancelAtPeriodEnd = user.cancelAtPeriodEnd;

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
                    const stripeCancelAtPeriodEnd = (sub as any).cancel_at_period_end || false;

                    // Sync with DB if different (basic check, or just always update to be safe and simple)
                    if (
                        stripeCurrentPeriodEnd?.getTime() !== user.currentPeriodEnd?.getTime() ||
                        stripeStatus !== user.subscriptionStatus ||
                        stripeCancelAtPeriodEnd !== user.cancelAtPeriodEnd
                    ) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                currentPeriodEnd: stripeCurrentPeriodEnd,
                                subscriptionStatus: stripeStatus === 'active' || stripeStatus === 'trialing' ? stripeStatus : 'inactive', // Map Stripe status to our enum roughly, or better use the exact mapping logic if needed.
                                cancelAtPeriodEnd: stripeCancelAtPeriodEnd,
                                // Note: The schema enum has 'active', 'trialing', 'past_due', 'canceled', 'inactive'.
                                // Stripe statuses: active, past_due, unpaid, canceled, incomplete, incomplete_expired, trialing.
                            },
                        });
                        currentPeriodEnd = stripeCurrentPeriodEnd;
                        cancelAtPeriodEnd = stripeCancelAtPeriodEnd;
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
        cancelAtPeriodEnd,
    };
}

export async function cancelSubscription() {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
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

export async function applyOneOffCoupon(code: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Not authenticated' };

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return { error: 'User not found' };

    if (
        (!process.env.COUPON_ONE || code.trim().toLowerCase() !== process.env.COUPON_ONE.toLowerCase()) &&
        (!process.env.COUPON_TWO || code.trim().toLowerCase() !== process.env.COUPON_TWO.toLowerCase())
    ) {
        return { error: 'Invalid coupon code.' };
    }

    try {
        if (process.env.COUPON_ONE && code.trim().toLowerCase() === process.env.COUPON_ONE.toLowerCase()) {
            if (user.hasUsedPromoOne) {
                return { error: 'You have already used this coupon code.' };
            }

            const targetDate = new Date('2026-03-24T00:00:00Z'); // March 23rd 2026, inclusive end of day UTC
            const now = new Date();

            if (now > targetDate) {
                return { error: 'This coupon has expired.' };
            }

            const daysToTarget = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            let newPeriodEnd = user.currentPeriodEnd || new Date();

            // If they have an active stripe subscription, we update trial_end
            if (user.stripeSubscriptionId && user.subscriptionStatus === 'active') {
                // To extend their current period end by daysToTarget days:
                // We can schedule a trial end. Stripe allows `trial_end` on update for active subs
                // `trial_end` must be in the future. We can set it to the current period end + daysToTarget * 24h
                const currentEndMs = user.currentPeriodEnd ? user.currentPeriodEnd.getTime() : now.getTime();
                const newTrialEndMs = currentEndMs + daysToTarget * 24 * 60 * 60 * 1000;
                const newTrialEndUnix = Math.floor(newTrialEndMs / 1000);
                newPeriodEnd = new Date(newTrialEndMs);

                await stripe.subscriptions.update(user.stripeSubscriptionId, {
                    trial_end: newTrialEndUnix,
                });
            } else if (user.subscriptionStatus === 'trialing') {
                const currentEndMs = user.trialEndsAt ? user.trialEndsAt.getTime() : now.getTime();
                newPeriodEnd = new Date(currentEndMs + daysToTarget * 24 * 60 * 60 * 1000);
            } else {
                // Not active or trialing
                return { error: 'You must have an active subscription or trial to apply this coupon.' };
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    hasUsedPromoOne: true,
                    currentPeriodEnd: user.subscriptionStatus === 'active' ? newPeriodEnd : user.currentPeriodEnd,
                    trialEndsAt: user.subscriptionStatus === 'trialing' ? newPeriodEnd : user.trialEndsAt,
                },
            });

            return { success: true, message: 'Coupon applied! Your trial has been extended until March 23rd, 2026.' };
        } else if (process.env.COUPON_TWO && code.trim().toLowerCase() === process.env.COUPON_TWO.toLowerCase()) {
            if (user.hasUsedPromoTwo) {
                return { error: 'You have already used this coupon code.' };
            }

            const targetDate = new Date('2026-04-13T00:00:00Z');
            const now = new Date();

            if (now > targetDate) {
                return { error: 'This coupon has expired.' };
            }

            const daysToTarget = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            let newPeriodEnd = user.currentPeriodEnd || new Date();
w
            // If they have an active stripe subscription, we update trial_end
            if (user.stripeSubscriptionId && user.subscriptionStatus === 'active') {
                // To extend their current period end by daysToTarget days:
                // We can schedule a trial end. Stripe allows `trial_end` on update for active subs
                // `trial_end` must be in the future. We can set it to the current period end + daysToTarget * 24h
                const currentEndMs = user.currentPeriodEnd ? user.currentPeriodEnd.getTime() : now.getTime();
                const newTrialEndMs = currentEndMs + daysToTarget * 24 * 60 * 60 * 1000;
                const newTrialEndUnix = Math.floor(newTrialEndMs / 1000);
                newPeriodEnd = new Date(newTrialEndMs);

                await stripe.subscriptions.update(user.stripeSubscriptionId, {
                    trial_end: newTrialEndUnix,
                });
            } else if (user.subscriptionStatus === 'trialing') {
                const currentEndMs = user.trialEndsAt ? user.trialEndsAt.getTime() : now.getTime();
                newPeriodEnd = new Date(currentEndMs + daysToTarget * 24 * 60 * 60 * 1000);
            } else {
                // Not active or trialing
                return { error: 'You must have an active subscription or trial to apply this coupon.' };
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    hasUsedPromoTwo: true,
                    currentPeriodEnd: user.subscriptionStatus === 'active' ? newPeriodEnd : user.currentPeriodEnd,
                    trialEndsAt: user.subscriptionStatus === 'trialing' ? newPeriodEnd : user.trialEndsAt,
                },
            });

            return { success: true, message: 'Coupon applied! Your trial has been extended until April 12th, 2026.' };
        } else return { error: 'No coupons matched' };
    } catch (error: any) {
        console.error('Error applying coupon:', error);
        return { error: error.message };
    }
}
