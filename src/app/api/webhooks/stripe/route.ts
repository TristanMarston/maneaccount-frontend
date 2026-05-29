import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe-init';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import Stripe from 'stripe';

function mapStripeStatus(status: string, hasUsedTrial: boolean): SubscriptionStatus {
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
    const { STRIPE_PRICE_PROFESSIONAL_MONTHLY, STRIPE_PRICE_PROFESSIONAL_YEARLY, STRIPE_PRICE_ENTERPRISE_MONTHLY, STRIPE_PRICE_ENTERPRISE_YEARLY } = process.env;

    if (priceId === STRIPE_PRICE_PROFESSIONAL_MONTHLY || priceId === STRIPE_PRICE_PROFESSIONAL_YEARLY) return 'professional';
    if (priceId === STRIPE_PRICE_ENTERPRISE_MONTHLY || priceId === STRIPE_PRICE_ENTERPRISE_YEARLY) return 'enterprise';
    return 'starter';
}

function inferHasUsedTrial(currentValue: boolean, stripeStatus: string, existingPeriodEnd: Date | null): boolean {
    return currentValue || stripeStatus !== 'trialing' || !!existingPeriodEnd;
}

// Resolves the internal userId from a Stripe subscription object.
// Tries subscription metadata first, then falls back to the customer record.
async function resolveUserId(subscription: Stripe.Subscription): Promise<string | null> {
    if (subscription.metadata?.userId) {
        return subscription.metadata.userId;
    }

    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

    const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
        select: { id: true },
    });

    return user?.id ?? null;
}

// ─── Core event handlers ─────────────────────────────────────────────────────

/**
 * Handles subscription.updated and customer.subscription.created.
 * Syncs status, tier, period end, and cancel flag into your DB.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = await resolveUserId(subscription);
    if (!userId) {
        console.warn('[webhook] handleSubscriptionUpdated: no user found for subscription', subscription.id);
        return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { hasUsedTrial: true, currentPeriodEnd: true } });
    if (!user) return;

    const priceId = subscription.items.data[0]?.price.id ?? '';
    const tier = mapPriceIdToTier(priceId);
    const rawCurrentPeriodEnd = (subscription as any).current_period_end;
    const currentPeriodEnd = rawCurrentPeriodEnd ? new Date(rawCurrentPeriodEnd * 1000) : null;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;
    const hasUsedTrial = inferHasUsedTrial(user.hasUsedTrial, subscription.status, user.currentPeriodEnd);
    const status = mapStripeStatus(subscription.status, hasUsedTrial);

    await prisma.user.update({
        where: { id: userId },
        data: {
            stripeSubscriptionId: subscription.id,
            subscriptionTier: tier,
            subscriptionStatus: status,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            hasUsedTrial,
            // Clear trialEndsAt once the user moves off a trial
            ...(status !== 'trialing' ? { trialEndsAt: null } : {}),
        },
    });

    console.log(`[webhook] subscription updated — user: ${userId}, status: ${status}, tier: ${tier}`);
}

/**
 * Handles customer.subscription.deleted.
 * Marks the subscription as canceled and removes access.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const userId = await resolveUserId(subscription);
    if (!userId) {
        console.warn('[webhook] handleSubscriptionDeleted: no user found for subscription', subscription.id);
        return;
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            stripeSubscriptionId: null,
            subscriptionStatus: 'canceled',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
            trialEndsAt: null,
        },
    });

    console.log(`[webhook] subscription deleted — user: ${userId}`);
}

/**
 * Handles invoice.payment_succeeded.
 * On a successful renewal, push the period end forward and ensure status is active.
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    // Only act on subscription invoices (not one-off charges)
    const subscriptionId = (invoice as any).subscription;
    if (!subscriptionId) return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = await resolveUserId(subscription);
    if (!userId) {
        console.warn('[webhook] handleInvoicePaymentSucceeded: no user found for invoice', invoice.id);
        return;
    }

    const rawPeriodEnd = (subscription as any).current_period_end;
    const currentPeriodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000) : new Date();
    const priceId = subscription.items.data[0]?.price.id ?? '';
    const tier = mapPriceIdToTier(priceId);

    await prisma.user.update({
        where: { id: userId },
        data: {
            stripeSubscriptionId: subscription.id,
            subscriptionTier: tier,
            subscriptionStatus: 'active',
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            trialEndsAt: null,
            hasUsedTrial: true,
        },
    });

    console.log(`[webhook] payment succeeded — user: ${userId}, next renewal: ${currentPeriodEnd.toISOString()}`);
}

/**
 * Handles invoice.payment_failed and invoice.payment_action_required.
 * Marks the subscription as past_due so your UI can prompt the user to update their card.
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription;
    if (!subscriptionId) return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = await resolveUserId(subscription);
    if (!userId) {
        console.warn('[webhook] handleInvoicePaymentFailed: no user found for invoice', invoice.id);
        return;
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            subscriptionStatus: mapStripeStatus(subscription.status, true),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
    });

    console.log(`[webhook] payment failed — user: ${userId}`);
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const body = await req.text(); // Must be raw text for signature verification
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        // This fires if the signature is wrong (e.g. wrong secret, or body was parsed before we read it)
        console.error('[webhook] signature verification failed:', err.message);
        return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
    }

    try {
        switch (event.type) {
            // A subscription was created or its plan/status changed
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                break;

            // A subscription was fully canceled (end of period or immediately)
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            // A recurring payment went through — advance the period end date
            case 'invoice.paid':
            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
                break;

            // A payment attempt failed — surface this in your UI
            case 'invoice.payment_action_required':
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            default:
                // Unhandled event types are fine — just acknowledge them
                console.log(`[webhook] unhandled event type: ${event.type}`);
        }
    } catch (err) {
        console.error(`[webhook] error processing event ${event.type}:`, err);
        // Return 500 so Stripe retries the event
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
}
