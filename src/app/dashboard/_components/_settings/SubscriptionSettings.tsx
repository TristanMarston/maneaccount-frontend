'use client';

import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Check, AlertCircle, CreditCard, Calendar, X } from 'lucide-react';
import { createSetupIntent, getPaymentConfig, updateSubscription, getSubscriptionDetails, cancelSubscription, applyOneOffCoupon } from '@/app/actions/billing';
import { failToast, successToast } from '../../../context';
import { cn } from '@/lib/utils';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { motion, Variants } from 'motion/react';
import { pricingPlans } from '@/app/_components/_landing/_pricing/Pricing';

const SetupForm = ({ onSuccess, onCancel }: { onSuccess: (paymentMethodId: string) => void; onCancel: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!stripe || !elements) return;

        setIsLoading(true);
        setErrorMessage(null);

        const { error, setupIntent } = await stripe.confirmSetup({
            elements,
            redirect: 'if_required',
        });

        if (error) {
            setErrorMessage(error.message || 'An error occurred');
            setIsLoading(false);
        } else if (setupIntent && setupIntent.status === 'succeeded') {
            // Payment method setup successful
            // Now we can use the setupIntent.payment_method to update subscription
            if (typeof setupIntent.payment_method === 'string') {
                onSuccess(setupIntent.payment_method);
            } else {
                // Should arguably not happen in this flow if we just created it
                setErrorMessage('Failed to retrieve payment method ID');
                setIsLoading(false);
            }
        } else {
            setErrorMessage('Setup failed. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className='w-full space-y-6 font-figtree'>
            <PaymentElement />
            {errorMessage && (
                <div className='text-red-500 text-sm flex items-center gap-2'>
                    <AlertCircle size={16} />
                    {errorMessage}
                </div>
            )}
            <div className='flex gap-3'>
                <button
                    type='button'
                    onClick={onCancel}
                    className='flex-1 py-2.5 px-4 rounded-[10px] cursor-pointer bg-background primary-border-hover text-primary font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-nowrap'
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!stripe || isLoading}
                    className='flex-1 py-2.5 px-4 rounded-[10px] cursor-pointer text-background primary-border-hover bg-primary-light font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-nowrap'
                >
                    {isLoading && <Loader2 size={16} className='animate-spin' />}
                    Confirm & Subscribe
                </button>
            </div>
        </div>
    );
};

const SubscriptionSettings = ({
    updateSubscriptionTier,
    setCancelSubscriptionModal,
    isFrozen,
}: {
    updateSubscriptionTier: (
        sub: {
            subscriptionTier: SubscriptionTier;
            subscriptionStatus: SubscriptionStatus;
            trialEndsAt: Date | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            subscriptionInterval: string;
        } | null,
    ) => void;
    setCancelSubscriptionModal: React.Dispatch<
        React.SetStateAction<{
            open: boolean;
            trial: boolean;
            onConfirm: (() => Promise<void>) | null;
            loading: boolean;
        }>
    >;
    isFrozen: boolean;
}) => {
    const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
    const [config, setConfig] = useState<any>(null);
    const [subscription, setSubscription] = useState<{
        subscriptionTier: SubscriptionTier;
        subscriptionStatus: SubscriptionStatus;
        trialEndsAt: Date | null;
        currentPeriodEnd: Date | null;
        stripeCustomerId: string | null;
        hasPaymentMethod: boolean;
        subscriptionInterval: string;
        cancelAtPeriodEnd?: boolean;
    } | null>(null);

    const [loading, setLoading] = useState(true);
    const [canceling, setCanceling] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | null>(null);

    // For Setup Intent
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const [conf, sub] = await Promise.all([getPaymentConfig(), getSubscriptionDetails()]);
            setConfig(conf);
            setSubscription(sub as any);

            if (conf?.publishableKey) {
                setStripePromise(loadStripe(conf.publishableKey));
            }

            if (sub) {
                setSelectedPlan(sub.subscriptionTier);
                setBillingCycle(sub.subscriptionInterval === 'month' ? 'monthly' : sub.subscriptionInterval === 'year' ? 'yearly' : 'monthly');
            }
            setLoading(false);
        };

        init();
    }, []);

    const handleSelectPlan = async (tier: SubscriptionTier) => {
        if (!config) return;

        const priceId = config.prices[tier][billingCycle];
        if (!priceId) return failToast('Price not found for this plan configuration');

        if (subscription?.subscriptionStatus === 'active' || subscription?.subscriptionStatus === 'trialing') {
            setProcessingPlan(priceId);
            setSelectedPlan(tier);
            startPaymentFlow(priceId);
        } else {
            setProcessingPlan(priceId);
            setSelectedPlan(tier);
            startPaymentFlow(priceId);
        }
    };

    const startPaymentFlow = async (priceId: string) => {
        // Create setup intent to collect card details
        const res = await createSetupIntent();
        if (res.error) {
            failToast(res.error);
            return;
        }
        if (res.clientSecret) {
            setClientSecret(res.clientSecret);
            setShowPaymentModal(true);
        }
    };

    const handlePaymentSuccess = async (paymentMethodId: string) => {
        if (!processingPlan) return;

        const res = await updateSubscription(paymentMethodId, processingPlan);
        if (res.success) {
            successToast('Subscription updated successfully!');
            setShowPaymentModal(false);
            setClientSecret(null);

            const sub = await getSubscriptionDetails();
            updateSubscriptionTier(sub);
            setSubscription(sub as any);

            window.location.reload();
        } else {
            failToast(res.error || 'Failed to update subscription');
        }
    };

    const handleCancelSubscription = async () => {
        setCancelSubscriptionModal((prev) => ({ ...prev, loading: true }));
        setCanceling(true);
        const res = await cancelSubscription();
        if (res.success) {
            successToast('Subscription canceled successfully. It will remain active until the end of the billing cycle.');
            const sub = await getSubscriptionDetails();
            updateSubscriptionTier(sub);
            setSubscription(sub as any);
        } else {
            failToast(res.error || 'Failed to cancel subscription');
        }
        setCancelSubscriptionModal((prev) => ({ ...prev, loading: false }));
        setCanceling(false);
    };

    const handleApplyOneOffCoupon = async () => {
        if (!couponCode.trim()) return;
        setApplyingCoupon(true);
        const res = await applyOneOffCoupon(couponCode);
        if (res.success) {
            successToast('Coupon applied! Your trial has been extended until March 23rd, 2026.');
            setCouponCode('');
            const sub = await getSubscriptionDetails();
            updateSubscriptionTier(sub);
            setSubscription(sub as any);
        } else {
            failToast(res.error || 'Failed to apply coupon');
        }
        setApplyingCoupon(false);
    };

    if (loading) {
        return (
            <div className='w-full h-64 flex items-center justify-center'>
                <span className='loader-primary'></span>
            </div>
        );
    }

    const now = new Date();
    const trialEndsAtDate = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
    const currentPeriodEndDate = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;

    const daysLeft = trialEndsAtDate ? Math.ceil((trialEndsAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const isTrial = subscription?.subscriptionStatus === 'trialing' && daysLeft > 0;

    const periodDaysLeft = currentPeriodEndDate ? Math.ceil((currentPeriodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const isActive = subscription?.subscriptionStatus === 'active' && periodDaysLeft > 0;

    return (
        <div className='space-y-8 max-w-4xl animate-in fade-in duration-500'>
            <div
                className={cn(
                    'rounded-[14px] p-6',
                    isFrozen
                        ? 'sky-border'
                        : subscription?.subscriptionTier === 'enterprise'
                          ? 'amber-border bg-linear-to-br to-amber-500/20 from-amber-500/5'
                          : subscription?.subscriptionTier === 'professional'
                            ? 'violet-border bg-linear-to-br to-violet-500/20 from-violet-500/5'
                            : subscription?.subscriptionTier === 'starter'
                              ? 'sky-border bg-linear-to-br to-sky-500/20 from-sky-500/5'
                              : '',
                )}
            >
                <div className='relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6'>
                    <div>
                        <div
                            className={cn(
                                'flex items-center gap-2 font-bold mb-1 text-sm uppercase tracking-wide',
                                isFrozen
                                    ? 'text-sky-700'
                                    : subscription?.subscriptionTier === 'enterprise'
                                      ? 'text-amber-700'
                                      : subscription?.subscriptionTier === 'professional'
                                        ? 'text-violet-700'
                                        : subscription?.subscriptionTier === 'starter'
                                          ? 'text-sky-700'
                                          : '',
                            )}
                        >
                            Current Status
                        </div>
                        <div className='flex items-center gap-x-3 flex-wrap'>
                            <h2
                                className={cn(
                                    'text-4xl font-bold font-lusitana mb-2',
                                    isFrozen
                                        ? 'text-sky-800'
                                        : subscription?.subscriptionTier === 'enterprise'
                                          ? 'text-amber-800'
                                          : subscription?.subscriptionTier === 'professional'
                                            ? 'text-violet-800'
                                            : subscription?.subscriptionTier === 'starter'
                                              ? 'text-sky-800'
                                              : '',
                                )}
                            >
                                {isFrozen
                                    ? 'Account Frozen'
                                    : subscription?.subscriptionTier
                                      ? subscription.subscriptionTier.charAt(0).toUpperCase() + subscription.subscriptionTier.slice(1)
                                      : 'Inactive'}
                            </h2>
                            {subscription?.hasPaymentMethod && (
                                <div className='mb-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-bold text-xs uppercase tracking-tight'>
                                    <Check size={14} strokeWidth={3} />
                                    Payment Verified
                                </div>
                            )}
                            {subscription?.cancelAtPeriodEnd && !isFrozen && (
                                <div className='mb-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 font-bold text-xs uppercase tracking-tight'>
                                    <AlertCircle size={14} strokeWidth={3} />
                                    Canceled (Ends at Period End)
                                </div>
                            )}
                        </div>
                        {isFrozen && (
                            <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full w-fit bg-sky-500/10 text-sky-600')}>
                                <X size={16} />
                                <span className='text-sm font-bold'>Select a plan below to resume use</span>
                            </div>
                        )}
                        {isTrial && (
                            <div
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1 rounded-full w-fit',
                                    subscription?.subscriptionTier === 'enterprise'
                                        ? 'text-amber-600 bg-amber-500/10'
                                        : subscription?.subscriptionTier === 'professional'
                                          ? 'text-violet-600 bg-violet-500/10'
                                          : subscription?.subscriptionTier === 'starter'
                                            ? 'text-sky-600 bg-sky-500/10'
                                            : '',
                                )}
                            >
                                <Calendar size={16} />
                                <span className='text-sm font-bold'>{daysLeft} days remaining in free trial</span>
                            </div>
                        )}
                        {isActive && (
                            <div
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1 rounded-full w-fit',
                                    subscription?.subscriptionTier === 'enterprise'
                                        ? 'text-amber-600 bg-amber-500/10'
                                        : subscription?.subscriptionTier === 'professional'
                                          ? 'text-violet-600 bg-violet-500/10'
                                          : subscription?.subscriptionTier === 'starter'
                                            ? 'text-sky-600 bg-sky-500/10'
                                            : '',
                                )}
                            >
                                <Calendar size={16} />
                                <span className='text-sm font-bold'>
                                    {periodDaysLeft} days remaining this {subscription?.subscriptionInterval === 'year' ? 'year' : 'month'}
                                </span>
                            </div>
                        )}
                        {!isTrial && !isActive && subscription?.subscriptionStatus === 'active' && (
                            <div
                                className={cn(
                                    'flex items-center gap-2 text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full w-fit',
                                    subscription?.subscriptionTier === 'enterprise'
                                        ? 'text-amber-600 bg-amber-500/10'
                                        : subscription?.subscriptionTier === 'professional'
                                          ? 'text-violet-600 bg-violet-500/10'
                                          : subscription?.subscriptionTier === 'starter'
                                            ? 'text-sky-600 bg-sky-500/10'
                                            : '',
                                )}
                            >
                                <Check size={16} />
                                <span className='text-sm font-bold'>Active</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <div className='flex flex-col @min-[500px]/subscription:flex-row @min-[500px]/subscription:justify-between @min-[500px]/subscription:items-center mb-6 gap-4'>
                    <div>
                        <h3 className='text-2xl font-bold text-gray-900 font-lusitana'>Select a Plan</h3>
                        <p className='text-gray-500 font-figtree'>Choose payment schedule</p>
                    </div>
                    <div className='grid grid-cols-2 gap-2 p-1 rounded-xl font-bold text-sm'>
                        <button type='button' className='bg-primary rounded-[10px] cursor-pointer w-full' onClick={() => setBillingCycle('monthly')}>
                            <motion.div
                                variants={rowHoverVariants}
                                initial={'unhovered'}
                                whileHover={billingCycle === 'monthly' ? 'selected' : 'hovered'}
                                animate={billingCycle === 'monthly' ? 'selected' : 'unhovered'}
                                className='font-lusitana capitalize flex text-primary text-lg bg-white rounded-[10px] px-8 py-1.5 border-[1.9px] border-primary w-full h-full items-center justify-center'
                            >
                                Monthly
                            </motion.div>
                        </button>
                        <button type='button' className='bg-primary rounded-[10px] cursor-pointer w-full relative' onClick={() => setBillingCycle('yearly')}>
                            <motion.div
                                variants={rowHoverVariants}
                                initial={'unhovered'}
                                whileHover={billingCycle === 'yearly' ? 'selected' : 'hovered'}
                                animate={billingCycle === 'yearly' ? 'selected' : 'unhovered'}
                                className='font-lusitana capitalize flex text-primary text-lg bg-white rounded-[10px] px-8 py-1.5 border-[1.9px] border-primary w-full h-full items-center justify-center'
                            >
                                Yearly
                            </motion.div>
                            <motion.div
                                initial={{ top: '-18px' }}
                                animate={{ top: billingCycle === 'yearly' ? '-22px' : '-18px' }}
                                transition={{ duration: 0.2 }}
                                className='absolute -right-2 bg-amber-100 border border-amber-200 shadow-sm rotate-3 uppercase px-2 py-0.5 rounded-lg font-figtree font-bold text-amber-600'
                            >
                                Save 15%
                            </motion.div>
                        </button>
                    </div>
                </div>

                <div className='grid grid-cols-1 gap-6'>
                    {pricingPlans.map((plan) => {
                        return (
                            <div
                                key={plan.name}
                                className={cn(
                                    'rounded-[14px] p-6 space-y-3 group transition-all cursor-pointer',
                                    plan.name === 'starter'
                                        ? `sky-border-hover ${subscription?.subscriptionTier === plan.name && billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') && !isFrozen ? 'bg-linear-to-br from-sky-500/5 to-sky-500/15' : 'bg-background'}`
                                        : plan.name === 'professional'
                                          ? `violet-border-hover ${subscription?.subscriptionTier === plan.name && billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') && !isFrozen ? 'bg-linear-to-br from-violet-500/5 to-violet-500/15' : 'bg-background'}`
                                          : plan.name === 'enterprise'
                                            ? `amber-border-hover ${subscription?.subscriptionTier === plan.name && billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') && !isFrozen ? 'bg-linear-to-br from-amber-500/5 to-amber-500/15' : 'bg-background'}`
                                            : '',
                                )}
                                onClick={() => handleSelectPlan(plan.name as SubscriptionTier)}
                            >
                                <div className='flex items-center justify-between flex-wrap gap-2'>
                                    <div className='flex items-center gap-1 flex-wrap'>
                                        <span className='text-3xl font-bold text-gray-900 capitalize font-lusitana pr-2'>{plan.name}</span>
                                        <span
                                            className={cn(
                                                'text-base font-figtree font-medium px-2 py-0.5 rounded-lg',
                                                plan.name === 'starter'
                                                    ? `text-sky-600 bg-sky-600/10 border border-sky-200`
                                                    : plan.name === 'professional'
                                                      ? `text-violet-600 bg-violet-600/10 border border-violet-200`
                                                      : plan.name === 'enterprise'
                                                        ? `text-amber-600 bg-amber-600/10 border border-amber-200`
                                                        : '',
                                            )}
                                        >
                                            ${billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly} / {billingCycle === 'monthly' ? 'mo' : 'yr'}
                                        </span>
                                    </div>
                                </div>
                                <ul className='space-y-2.5'>
                                    {plan.features.map(({ description, included }, i) => (
                                        <li key={i} className='flex items-start'>
                                            <div
                                                className={cn(
                                                    'shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
                                                    included ? 'bg-gray-100 text-gray-600' : 'bg-gray-300 text-gray-600',
                                                    subscription?.subscriptionTier === plan.name &&
                                                        billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') &&
                                                        !isFrozen
                                                        ? plan.name === 'starter'
                                                            ? 'text-sky-600 bg-sky-50'
                                                            : plan.name === 'professional'
                                                              ? 'text-violet-600 bg-violet-50'
                                                              : 'text-amber-600 bg-amber-50'
                                                        : '',
                                                )}
                                            >
                                                {included ? <Check className='w-3 h-3' strokeWidth={3} /> : <X className='w-3 h-3' strokeWidth={3} />}
                                            </div>
                                            <span className='ml-3 pt-px font-figtree text-gray-600 text-[15px] pricing-max:text-sm 4xl:text-[15px]'>{description}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type='button'
                                    className={cn(
                                        'w-full rounded-xl px-8 py-2.5 font-figtree font-bold text-lg cursor-pointer group-hover:translate-[2.5px_2.5px_0] group-hover:shadow-none! duration-300 ease-in-out',
                                        subscription?.subscriptionTier === plan.name &&
                                            billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') &&
                                            !isFrozen
                                            ? plan.name === 'starter'
                                                ? 'bg-sky-500 text-white sky-border'
                                                : plan.name === 'professional'
                                                  ? 'bg-violet-500 text-white violet-border'
                                                  : 'bg-amber-500 text-white amber-border'
                                            : plan.name === 'starter'
                                              ? 'bg-background text-sky-600 sky-border'
                                              : plan.name === 'professional'
                                                ? 'bg-background text-violet-600 violet-border'
                                                : 'bg-background text-amber-600 amber-border',
                                        subscription?.subscriptionTier === plan.name &&
                                            billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') &&
                                            !isFrozen
                                            ? 'translate-[2.5px_2.5px_0] shadow-none!'
                                            : subscription?.subscriptionTier === plan.name && !isFrozen
                                              ? plan.name === 'starter'
                                                  ? 'bg-sky-500/10'
                                                  : plan.name === 'professional'
                                                    ? 'bg-violet-500/10'
                                                    : 'bg-amber-500/10'
                                              : '',
                                    )}
                                >
                                    {subscription?.subscriptionTier === plan.name && billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') && !isFrozen
                                        ? 'Current Plan'
                                        : subscription?.subscriptionTier === plan.name && !isFrozen
                                          ? `Switch to ${subscription?.subscriptionInterval === 'year' ? 'Monthly' : 'Yearly'} Plan`
                                          : 'Select Plan'}
                                </button>
                            </div>
                        );
                    })}
                    {(isActive || isTrial) && !subscription?.cancelAtPeriodEnd && (
                        <div className='flex flex-col gap-4 mt-4'>
                            <div className='bg-primary/5 border border-primary/20 rounded-[14px] p-4 flex flex-col gap-2'>
                                <label className='text-sm font-bold text-gray-700 font-figtree'>Have a special promo code?</label>
                                <div className='flex gap-2 w-full'>
                                    <input
                                        type='text'
                                        placeholder='Enter code...'
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        className='flex-1 bg-white outline-none shadow-sm border border-gray-200 px-3 py-2 text-sm rounded-[10px] focus:border-primary transition-colors font-figtree min-w-0'
                                    />
                                    <button
                                        onClick={handleApplyOneOffCoupon}
                                        disabled={applyingCoupon || !couponCode.trim()}
                                        className='bg-primary text-white cursor-pointer px-4 py-2 rounded-[10px] text-sm font-bold shadow-sm whitespace-nowrap hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-20'
                                    >
                                        {applyingCoupon ? <Loader2 size={16} className='animate-spin' /> : 'Redeem'}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setCancelSubscriptionModal({ open: true, trial: isTrial, onConfirm: handleCancelSubscription, loading: false });
                                }}
                                type='button'
                                disabled={canceling}
                                className='text-background cursor-pointer text-lg font-bold font-figtree bg-red-400 red-border-hover rounded-[10px] px-2 py-2 flex justify-center items-center'
                            >
                                {canceling ? <Loader2 size={24} className='animate-spin' /> : 'Cancel Subscription'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showPaymentModal && clientSecret && (
                <div className='fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in font-figtree'>
                    <div className='bg-white @container/payment-window rounded-2xl primary-border-bold w-full max-w-3xl max-h-[93dvh] overflow-y-auto p-6 animate-in zoom-in-95 duration-200'>
                        <h3 className='text-3xl font-bold text-gray-900 font-lusitana'>Payment Details</h3>
                        <p className='text-sm text-gray-500 mt-1 mb-4'>
                            {isTrial ? 'Your card will be charged immediately, and your trial will be over.' : 'Securely enter your payment information.'}
                        </p>
                        <div className='flex gap-6 flex-col-reverse @min-[650px]/payment-window:flex-row'>
                            {/* Left Side: Stripe Payment Element */}
                            <div className='flex-1'>
                                <Elements
                                    stripe={stripePromise}
                                    options={{
                                        clientSecret,
                                        appearance: {
                                            theme: 'stripe',
                                            variables: {
                                                fontFamily: 'Figtree, sans-serif',
                                                colorPrimary: '#538475',
                                                colorBackground: '#ffffff',
                                                colorText: '#111827',
                                                colorDanger: '#ef4444',
                                                borderRadius: '10px',
                                                spacingGridRow: '16px',
                                            },
                                            rules: {
                                                '.Input': {
                                                    border: '1.9px solid #e5e7eb',
                                                    boxShadow: 'none',
                                                    transition: 'border-color 0.2s ease',
                                                    padding: '8px 12px',
                                                    fontSize: '15px',
                                                },
                                                '.Input:focus': {
                                                    border: '1.9px solid #538475',
                                                    boxShadow: '2.5px 2.5px 0 0 #538475',
                                                },
                                                '.Label': {
                                                    fontWeight: '600',
                                                    marginBottom: '4px',
                                                },
                                            },
                                        },
                                    }}
                                >
                                    <SetupForm
                                        onSuccess={handlePaymentSuccess}
                                        onCancel={() => {
                                            setShowPaymentModal(false);
                                            setClientSecret(null);
                                        }}
                                    />
                                </Elements>
                            </div>

                            {/* Right Side: Order Summary & Coupon */}
                            <div className='w-full @min-[650px]/payment-window:w-72 bg-gray-50 rounded-xl p-5 border border-gray-200 h-fit'>
                                <h4 className='text-lg font-bold text-gray-900 mb-4'>Order Summary</h4>
                                <div className='space-y-3 mb-6'>
                                    <div className='flex justify-between text-sm'>
                                        <span className='text-gray-600 capitalize'>
                                            {selectedPlan} Plan {billingCycle}
                                        </span>
                                        <span className='font-semibold text-gray-900'>
                                            ${pricingPlans.find((p) => p.name === selectedPlan)?.[billingCycle === 'monthly' ? 'priceMonthly' : 'priceYearly'] || 0}
                                        </span>
                                    </div>
                                    <div className='flex justify-between text-sm pt-3 border-t border-gray-200'>
                                        <span className='font-bold text-gray-900'>Total Due Today</span>
                                        <span className='font-bold text-gray-900'>
                                            ${pricingPlans.find((p) => p.name === selectedPlan)?.[billingCycle === 'monthly' ? 'priceMonthly' : 'priceYearly'] || 0}
                                        </span>
                                    </div>
                                </div>

                                <div className='space-y-2'>
                                    <label className='text-xs font-bold text-gray-500 uppercase'>Have a coupon code?</label>
                                    <div className='flex gap-2'>
                                        <input
                                            type='text'
                                            placeholder='Code'
                                            className='w-full bg-white outline-none shadow-sm border border-gray-200 px-3 py-2 text-sm rounded-lg focus:border-primary transition-colors'
                                        />
                                        <button className='bg-gray-900 cursor-pointer text-white px-3 py-2 rounded-[10px] text-sm font-bold shadow-sm whitespace-nowrap hover:bg-gray-800 transition-colors'>
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const rowHoverVariants: Variants = {
    unhovered: {
        rotate: 0,
        y: 0,
        transition: { duration: 0.2 },
    },
    hovered: {
        rotate: -2.5,
        y: -6,
        transition: { type: 'spring', stiffness: 300, damping: 10, duration: 0.2 },
    },
    selected: {
        y: -4,
        transition: { type: 'spring', stiffness: 300, damping: 10, duration: 0.2 },
    },
};

export default SubscriptionSettings;
