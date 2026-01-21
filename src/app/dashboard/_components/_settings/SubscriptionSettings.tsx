'use client';

import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Check, AlertCircle, CreditCard, Calendar, X } from 'lucide-react';
import { createSetupIntent, getPaymentConfig, updateSubscription, getSubscriptionDetails } from '@/app/actions/billing';
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
}: {
    updateSubscriptionTier: (
        sub: {
            subscriptionTier: SubscriptionTier;
            subscriptionStatus: SubscriptionStatus;
            trialEndsAt: Date | null;
            stripeCustomerId: string | null;
        } | null,
    ) => void;
}) => {
    const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
    const [config, setConfig] = useState<any>(null);
    const [subscription, setSubscription] = useState<{
        subscriptionTier: SubscriptionTier;
        subscriptionStatus: SubscriptionStatus;
        trialEndsAt: Date | null;
        stripeCustomerId: string | null;
        hasPaymentMethod: boolean;
        subscriptionInterval: string;
    } | null>(null);

    const [loading, setLoading] = useState(true);
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

        // Update subscription
        const res = await updateSubscription(paymentMethodId, processingPlan);
        if (res.success) {
            successToast('Subscription updated successfully!');
            setShowPaymentModal(false);
            setClientSecret(null);

            // Refresh subscription details
            const sub = await getSubscriptionDetails();
            updateSubscriptionTier(sub);
            setSubscription(sub as any);
        } else {
            failToast(res.error || 'Failed to update subscription');
        }
    };

    if (loading) {
        return (
            <div className='w-full h-64 flex items-center justify-center'>
                <span className='loader'></span>
            </div>
        );
    }

    const daysLeft = subscription?.trialEndsAt ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const isTrial = subscription?.subscriptionStatus === 'trialing' && daysLeft > 0;

    return (
        <div className='space-y-8 max-w-4xl animate-in fade-in duration-500'>
            <div
                className={cn(
                    'rounded-[14px] p-6',
                    subscription?.subscriptionTier === 'enterprise'
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
                                subscription?.subscriptionTier === 'enterprise'
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
                        <div className='flex items-center gap-3 flex-wrap'>
                            <h2
                                className={cn(
                                    'text-4xl font-bold font-lusitana mb-2',
                                    subscription?.subscriptionTier === 'enterprise'
                                        ? 'text-amber-800'
                                        : subscription?.subscriptionTier === 'professional'
                                          ? 'text-violet-800'
                                          : subscription?.subscriptionTier === 'starter'
                                            ? 'text-sky-800'
                                            : '',
                                )}
                            >
                                {subscription?.subscriptionTier ? subscription.subscriptionTier.charAt(0).toUpperCase() + subscription.subscriptionTier.slice(1) : 'Inactive'}
                            </h2>
                            {subscription?.hasPaymentMethod && (
                                <div className='mb-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-bold text-xs uppercase tracking-tight'>
                                    <Check size={14} strokeWidth={3} />
                                    Payment Verified
                                </div>
                            )}
                        </div>
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
                        {!isTrial && subscription?.subscriptionStatus === 'active' && (
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
                                        ? `sky-border-hover ${selectedPlan === plan.name ? 'bg-linear-to-br from-sky-500/5 to-sky-500/15' : 'bg-background'}`
                                        : plan.name === 'professional'
                                          ? `violet-border-hover ${selectedPlan === plan.name ? 'bg-linear-to-br from-violet-500/5 to-violet-500/15' : 'bg-background'}`
                                          : plan.name === 'enterprise'
                                            ? `amber-border-hover ${selectedPlan === plan.name ? 'bg-linear-to-br from-amber-500/5 to-amber-500/15' : 'bg-background'}`
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
                                                    selectedPlan === plan.name
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
                                        selectedPlan === plan.name
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
                                        selectedPlan === plan.name && 'translate-[2.5px_2.5px_0] shadow-none!',
                                    )}
                                >
                                    {selectedPlan === plan.name ? 'Current Plan' : 'Select Plan'}
                                </button>
                            </div>
                        );
                    })}

                    {/* <div
                        className={cn(
                            'border rounded-2xl p-6 relative transition-all duration-300 hover:shadow-lg cursor-pointer group flex flex-col',
                            selectedPlan === 'starter' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-gray-200 bg-white',
                        )}
                        onClick={() => handleSelectPlan('starter')}
                    >
                        {selectedPlan === 'starter' && (
                            <div className='absolute top-4 right-4 text-blue-500'>
                                <Check size={20} />
                            </div>
                        )}
                        <StarterIcon />
                        <h4 className='text-lg font-bold text-gray-900'>Starter</h4>
                        <div className='mt-2 mb-6'>
                            <span className='text-3xl font-bold text-gray-900'>$29</span>
                            <span className='text-gray-500 font-medium'>/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                        </div>
                        <ul className='space-y-3 mb-8 flex-1'>
                            <li className='flex items-start gap-2 text-sm text-gray-600'>
                                <Check size={16} className='text-green-500 mt-0.5 shrink-0' />
                                <span>Basic profile</span>
                            </li>
                            <li className='flex items-start gap-2 text-sm text-gray-600'>
                                <Check size={16} className='text-green-500 mt-0.5 shrink-0' />
                                <span>Up to 10 jobs/month</span>
                            </li>
                        </ul>
                        <button
                            type='button'
                            className={cn(
                                'w-full py-2.5 rounded-xl font-bold transition-colors mt-auto',
                                selectedPlan === 'starter' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-50 text-gray-900 hover:bg-gray-100',
                            )}
                        >
                            {selectedPlan === 'starter' ? 'Current Plan' : 'Select Plan'}
                        </button>
                    </div>

                    <div
                        className={cn(
                            'border rounded-2xl p-6 relative transition-all duration-300 hover:shadow-lg cursor-pointer group flex flex-col',
                            selectedPlan === 'professional' ? 'border-purple-500 ring-1 ring-purple-500 bg-purple-50/10' : 'border-gray-200 bg-white',
                        )}
                        onClick={() => handleSelectPlan('professional')}
                    >
                        {selectedPlan === 'professional' && (
                            <div className='absolute top-4 right-4 text-purple-500'>
                                <Check size={20} />
                            </div>
                        )}
                        <ProfessionalIcon />
                        <h4 className='text-lg font-bold text-gray-900'>Professional</h4>
                        <div className='mt-2 mb-6'>
                            <span className='text-3xl font-bold text-gray-900'>$49</span>
                            <span className='text-gray-500 font-medium'>/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                        </div>
                        <ul className='space-y-3 mb-8 flex-1'>
                            <li className='flex items-start gap-2 text-sm text-gray-600'>
                                <Check size={16} className='text-green-500 mt-0.5 shrink-0' />
                                <span>Featured profile</span>
                            </li>
                            <li className='flex items-start gap-2 text-sm text-gray-600'>
                                <Check size={16} className='text-green-500 mt-0.5 shrink-0' />
                                <span>Unlimited jobs</span>
                            </li>
                            <li className='flex items-start gap-2 text-sm text-gray-600'>
                                <Check size={16} className='text-green-500 mt-0.5 shrink-0' />
                                <span>Analytics dashboard</span>
                            </li>
                        </ul>
                        <button
                            type='button'
                            className={cn(
                                'w-full py-2.5 rounded-xl font-bold transition-colors mt-auto',
                                selectedPlan === 'professional' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-50 text-gray-900 hover:bg-gray-100',
                            )}
                        >
                            {selectedPlan === 'professional' ? 'Current Plan' : 'Select Plan'}
                        </button>
                    </div>

                    <div
                        className={cn(
                            'border rounded-2xl p-6 relative transition-all duration-300 hover:shadow-lg cursor-pointer group flex flex-col',
                            selectedPlan === 'enterprise' ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/10' : 'border-gray-200 bg-white',
                        )}
                        onClick={() => handleSelectPlan('enterprise')}
                    >
                        {selectedPlan === 'enterprise' && (
                            <div className='absolute top-4 right-4 text-amber-500'>
                                <Check size={20} />
                            </div>
                        )}
                        <div className='absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide'>
                            Best Value
                        </div>
                        <EnterpriseIcon />
                        <h4 className='text-lg font-bold text-gray-900'>Enterprise</h4>
                        <div className='mt-2 mb-6'>
                            <span className='text-3xl font-bold text-gray-900'>$79</span>
                            <span className='text-gray-500 font-medium'>/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                        </div>
                        <ul className='space-y-3 mb-8 flex-1'>
                            <li className='flex items-start gap-2 text-sm text-gray-600'>
                                <Check size={16} className='text-green-500 mt-0.5 shrink-0' />
                                <span>Priority support</span>
                            </li>
                            <li className='flex items-start gap-2 text-sm text-gray-600'>
                                <Check size={16} className='text-green-500 mt-0.5 shrink-0' />
                                <span>Team management</span>
                            </li>
                            <li className='flex items-start gap-2 text-sm text-gray-600'>
                                <Check size={16} className='text-green-500 mt-0.5 shrink-0' />
                                <span>Custom integrations</span>
                            </li>
                        </ul>
                        <button
                            type='button'
                            className={cn(
                                'w-full py-2.5 rounded-xl font-bold transition-colors mt-auto',
                                selectedPlan === 'enterprise' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-gray-50 text-gray-900 hover:bg-gray-100',
                            )}
                        >
                            {selectedPlan === 'enterprise' ? 'Current Plan' : 'Select Plan'}
                        </button>
                    </div> */}
                </div>
            </div>

            {/* Payment Modal/Overlay */}
            {showPaymentModal && clientSecret && (
                <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in font-figtree'>
                    <div className='bg-white rounded-2xl primary-border-bold w-full max-w-md p-6 animate-in zoom-in-95 duration-200'>
                        <h3 className='text-3xl font-bold text-gray-900 font-lusitana'>Payment Details</h3>
                        <p className='text-sm text-gray-500 mt-1 mb-4'>
                            {isTrial ? 'Your card will not be charged until your trial ends.' : 'Securely enter your payment information.'}
                        </p>

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
