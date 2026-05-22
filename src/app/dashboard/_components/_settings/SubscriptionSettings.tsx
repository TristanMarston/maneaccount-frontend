'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Check, AlertCircle, CreditCard, Calendar, X, Info, Receipt, ExternalLink } from 'lucide-react';
import {
    createSetupIntent,
    updateSubscription,
    getPaymentConfig,
    getSubscriptionDetails,
    cancelSubscription,
    applyOneOffCoupon,
    getSubscriptionModalDetails,
    resumeSubscription,
    SubscriptionModalDetails,
    updateDefaultPaymentMethod,
} from '@/app/actions/billing';
import { failToast, successToast } from '../../../context';
import { cn } from '@/lib/utils';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { motion, Variants } from 'motion/react';
import { pricingPlans } from '@/app/_components/_landing/_pricing/Pricing';
import Modal from '../../Modal';
import { format } from 'date-fns';

const SetupForm = ({ selectedPriceId, onSuccess, onCancel }: { selectedPriceId: string; onSuccess: () => Promise<void>; onCancel: () => void }) => {
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
            if (typeof setupIntent.payment_method === 'string') {
                const subscriptionResult = await updateSubscription(setupIntent.payment_method, selectedPriceId);

                if (!subscriptionResult.success) {
                    setErrorMessage(subscriptionResult.error || 'Failed to update subscription.');
                    setIsLoading(false);
                    return;
                }

                if (subscriptionResult.requiresAction && subscriptionResult.clientSecret) {
                    const confirmation = await stripe.confirmCardPayment(subscriptionResult.clientSecret);

                    if (confirmation.error) {
                        setErrorMessage(confirmation.error.message || 'Additional payment confirmation failed.');
                        setIsLoading(false);
                        return;
                    }

                    if (confirmation.paymentIntent?.status !== 'succeeded') {
                        setErrorMessage('Payment was not completed. Please verify your card details and try again.');
                        setIsLoading(false);
                        return;
                    }
                }

                await onSuccess();
            } else {
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
                    <AlertCircle className='min-w-4' />
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

const UpdateCardForm = ({ onSuccess, onCancel }: { onSuccess: () => Promise<void>; onCancel: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
            if (typeof setupIntent.payment_method === 'string') {
                const result = await updateDefaultPaymentMethod(setupIntent.payment_method);

                if (!result.success) {
                    setErrorMessage(result.error || 'Failed to update payment method.');
                    setIsLoading(false);
                    return;
                }

                if (result.requiresAction && result.clientSecret) {
                    const confirmation = await stripe.confirmCardPayment(result.clientSecret);

                    if (confirmation.error) {
                        setErrorMessage(confirmation.error.message || 'Additional payment confirmation failed.');
                        setIsLoading(false);
                        return;
                    }

                    if (confirmation.paymentIntent?.status !== 'succeeded') {
                        setErrorMessage('Payment was not completed. Please verify your card details and try again.');
                        setIsLoading(false);
                        return;
                    }
                }

                await onSuccess();
            } else {
                setErrorMessage('Failed to retrieve payment method ID');
                setIsLoading(false);
            }
        } else {
            setErrorMessage('Setup failed. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className='w-full space-y-6 font-figtree'>
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
                    type='submit'
                    disabled={!stripe || isLoading}
                    className='flex-1 py-2.5 px-4 rounded-[10px] cursor-pointer text-background primary-border-hover bg-primary-light font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-nowrap'
                >
                    {isLoading && <Loader2 size={16} className='animate-spin' />}
                    Update Card
                </button>
            </div>
        </form>
    );
};

const SubscriptionDetailsModal = ({ open, onClose, stripePromise }: { open: boolean; onClose: () => void; stripePromise: Promise<any> | null }) => {
    const [details, setDetails] = useState<SubscriptionModalDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [updatingCard, setUpdatingCard] = useState(false);
    const [loadingSetupSecret, setLoadingSetupSecret] = useState(false);

    const handleStartUpdateCard = async () => {
        setLoadingSetupSecret(true);
        const res = await createSetupIntent();
        if (res.error) {
            failToast(res.error);
            setLoadingSetupSecret(false);
            return;
        }
        if (res.clientSecret) {
            setClientSecret(res.clientSecret);
            setUpdatingCard(true);
        }
        setLoadingSetupSecret(false);
    };

    const handleUpdateSuccess = async () => {
        successToast('Payment method updated successfully!');
        setUpdatingCard(false);
        setClientSecret(null);
        setLoading(true);
        const res = await getSubscriptionModalDetails();
        if (!res.error) {
            setDetails(res.data);
        } else {
            setError(res.error);
        }
        setLoading(false);
    };

    useEffect(() => {
        const getDetails = async () => {
            if (!open) return;
            setLoading(true);
            setError(null);
            setUpdatingCard(false);
            setClientSecret(null);

            const res = await getSubscriptionModalDetails();
            if (!res.error) {
                setDetails(res.data);
            } else setError(res.error);

            setLoading(false);
        };

        getDetails();
    }, [open]);

    const formatDate = (iso: string | null) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100);
    };

    const tierColor = (tier: SubscriptionTier) => {
        switch (tier) {
            case 'enterprise':
                return {
                    text: 'text-amber-700',
                    bg: 'bg-linear-to-br to-amber-500/20 from-amber-500/5',
                    darkBadge: 'bg-amber-500/20 text-amber-600',
                    solidBorder: 'border border-amber-500',
                    border: 'amber-border',
                    badge: 'bg-amber-100 text-amber-800',
                };
            case 'professional':
                return {
                    text: 'text-violet-700',
                    bg: 'bg-linear-to-br to-violet-500/20 from-violet-500/5',
                    darkBadge: 'bg-violet-500/20 text-violet-600',
                    solidBorder: 'border border-violet-500',
                    border: 'violet-border',
                    badge: 'bg-violet-100 text-violet-800',
                };
            case 'starter':
            default:
                return {
                    text: 'text-sky-700',
                    bg: 'bg-linear-to-br to-sky-500/20 from-sky-500/5',
                    darkBadge: 'bg-sky-500/20 text-sky-600',
                    solidBorder: 'border border-sky-500',
                    border: 'sky-border',
                    badge: 'bg-sky-100 text-sky-800',
                };
        }
    };

    const statusLabel = (status: SubscriptionStatus) => {
        switch (status) {
            case 'active':
                return { label: 'Active', className: 'bg-emerald-100 text-emerald-800' };
            case 'trialing':
                return { label: 'Free Trial', className: 'bg-blue-100 text-blue-800' };
            case 'past_due':
                return { label: 'Past Due', className: 'bg-red-100 text-red-800' };
            case 'canceled':
                return { label: 'Canceled', className: 'bg-gray-100 text-gray-800' };
            default:
                return { label: 'Inactive', className: 'bg-gray-100 text-gray-600' };
        }
    };

    return (
        <Modal isOpen={open} setIsOpen={onClose} className='max-w-3xl p-7 rounded-[18px] relative primary-border-bold @container/subscription-details-modal'>
            <div className='w-full mx-auto font-figtree'>
                <div className='flex items-center justify-between mb-6'>
                    <h3 className='text-3xl font-bold text-gray-900 font-lusitana'>Subscription Details</h3>
                    <button onClick={onClose} type='button' className='p-1.5 rounded-lg hover:scale-105 transition-all cursor-pointer'>
                        <X className='text-gray-500 w-5 h-5' />
                    </button>
                </div>

                {loading && (
                    <div className='flex items-center justify-center py-12'>
                        <span className='loader-primary'></span>
                    </div>
                )}

                {error && (
                    <div className='flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4'>
                        <AlertCircle size={18} />
                        <span className='text-sm font-medium'>{error}</span>
                    </div>
                )}

                {!loading &&
                    !error &&
                    details &&
                    (() => {
                        const colors = tierColor(details.tier);
                        const statusInfo = statusLabel(details.status);

                        return (
                            <div className='@min-[625px]/subscription-details-modal:space-y-0 space-y-5 @min-[625px]/subscription-details-modal:grid gap-x-4 gap-y-4 grid-cols-2'>
                                <div className={cn('rounded-[14px] p-5 flex flex-col justify-between space-y-2', colors.border, colors.bg, colors.text)}>
                                    <h2 className='text-2xl font-bold font-lusitana capitalize'>{details.tier} Plan</h2>
                                    <span className={cn('capitalize px-4 py-1 rounded-[14px] font-bold tracking-wide w-fit', colors.darkBadge, colors.solidBorder)}>
                                        {details.status === 'trialing' && details.trialEndsAt ? 'No Billing Cycle' : `${details.interval === 'year' ? 'Yearly' : 'Monthly'} billing`}
                                    </span>
                                </div>
                                <div className={cn('rounded-[14px] p-5 primary-border text-primary flex flex-col justify-between bg-primary-light/10')}>
                                    {details.status === 'trialing' && details.trialEndsAt && (
                                        <div className='space-y-2'>
                                            <h3 className='text-2xl font-bold font-lusitana capitalize'>Trial Ends</h3>

                                            <span
                                                title={format(new Date(details.trialEndsAt), 'MMM dd, yyyy HH:mm:ss')}
                                                className='rounded-[14px] font-semibold w-fit text-base px-4 py-1 border border-primary bg-primary-light/20 flex items-center gap-1.5'
                                            >
                                                <Calendar className='w-4.5 h-4.5' strokeWidth={2.5} />
                                                {format(new Date(details.trialEndsAt), 'MMM dd, yyyy')}
                                            </span>
                                        </div>
                                    )}
                                    {details.currentPeriodEnd && (
                                        <div className='space-y-2'>
                                            <h3 className='text-2xl font-bold font-lusitana capitalize'>{details.cancelAtPeriodEnd ? 'Access Until' : 'Next Renewal'}</h3>
                                            <span className='text-lg font-semibold font-figtree flex items-center gap-2 flex-wrap'>
                                                {details.upcomingInvoice && !details.cancelAtPeriodEnd && (
                                                    <span className='rounded-[14px] px-3 py-0.5 border border-primary bg-primary-light/20'>
                                                        {formatCurrency(details.upcomingInvoice.amountDue, details.upcomingInvoice.currency)}
                                                    </span>
                                                )}

                                                <span
                                                    title={format(new Date(details.currentPeriodEnd), 'MMM dd, yyyy HH:mm:ss')}
                                                    className='rounded-[14px] text-base px-4 py-1 border border-primary bg-primary-light/20 flex items-center gap-1.5'
                                                >
                                                    <Calendar className='w-4.5 h-4.5' strokeWidth={2.5} />
                                                    {format(new Date(details.currentPeriodEnd), 'MMM dd, yyyy')}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {details.cancelAtPeriodEnd && (
                                    <div className='col-span-2'>
                                        <div className='flex items-center gap-1.5 text-amber-700 text-sm font-medium'>
                                            <AlertCircle size={14} />
                                            Subscription cancels at end of billing period
                                        </div>
                                    </div>
                                )}

                                {/* Payment Method */}

                                <div className='space-y-3 col-span-2'>
                                    <div className='flex items-center justify-between'>
                                        <h4 className='text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5'>
                                            <CreditCard size={14} />
                                            Payment Method
                                        </h4>
                                        {!updatingCard && details.status !== 'trialing' && !details.trialEndsAt && (
                                            <button
                                                type='button'
                                                onClick={handleStartUpdateCard}
                                                disabled={loadingSetupSecret}
                                                className='text-sm font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50'
                                            >
                                                {loadingSetupSecret && <Loader2 size={12} className='animate-spin' />}
                                                {details.paymentMethod ? 'Change Card' : 'Add Card'}
                                            </button>
                                        )}
                                    </div>
                                    {updatingCard && clientSecret ? (
                                        <div className='bg-gray-50 border border-gray-200 shadow-sm rounded-[14px] p-5'>
                                            <Elements
                                                stripe={stripePromise}
                                                options={{
                                                    clientSecret,
                                                    fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap' }],
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
                                                <UpdateCardForm
                                                    onSuccess={handleUpdateSuccess}
                                                    onCancel={() => {
                                                        setUpdatingCard(false);
                                                        setClientSecret(null);
                                                    }}
                                                />
                                            </Elements>
                                        </div>
                                    ) : details.paymentMethod ? (
                                        <div className='flex items-center gap-3 bg-gray-50 border border-gray-200 shadow-sm rounded-[14px] px-4 py-3'>
                                            <div className='w-10 h-7 bg-white border border-gray-300 rounded flex items-center justify-center'>
                                                <CreditCard size={16} className='text-gray-500' />
                                            </div>
                                            <div>
                                                <p className='text-sm font-bold text-gray-900 capitalize'>
                                                    {details.paymentMethod.brand} •••• {details.paymentMethod.last4}
                                                </p>
                                                <p className='text-xs text-gray-500'>
                                                    Expires {String(details.paymentMethod.expMonth).padStart(2, '0')}/{details.paymentMethod.expYear}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className='flex items-center gap-2 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3'>
                                            <Info size={14} />
                                            <span className='text-sm'>No payment method on file</span>
                                        </div>
                                    )}
                                </div>

                                {/* Recent Invoices */}
                                {details.invoiceHistory.length > 0 && (
                                    <div className='space-y-3 col-span-2'>
                                        <h4 className='text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5'>
                                            <Receipt size={14} />
                                            Recent Invoices
                                        </h4>
                                        <div className='space-y-2'>
                                            {details.invoiceHistory.map((inv) => (
                                                <a
                                                    key={inv.id}
                                                    href={inv.hostedInvoiceUrl || '#'}
                                                    target='_blank'
                                                    rel='noopener noreferrer'
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={cn(
                                                        'flex items-center justify-between bg-gray-50 border border-gray-200 shadow-sm rounded-[14px] px-4 py-2.5 flex-wrap gap-2',
                                                        inv.hostedInvoiceUrl && 'cursor-pointer hover:bg-gray-100 transition-colors',
                                                    )}
                                                >
                                                    <div className='flex items-center gap-2'>
                                                        <span className='text-sm text-gray-600 font-medium'>{formatCurrency(inv.amountPaid, inv.currency)}</span>
                                                        <span
                                                            className={cn(
                                                                'text-xs font-bold uppercase px-1.5 py-0.5 rounded',
                                                                inv.status === 'paid'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : inv.status === 'open'
                                                                      ? 'bg-amber-100 text-amber-700'
                                                                      : 'bg-gray-100 text-gray-600',
                                                            )}
                                                        >
                                                            {inv.status}
                                                        </span>
                                                    </div>
                                                    <div className='flex items-center gap-2'>
                                                        <span title={format(inv.created, 'MMM dd, yyyy HH:mm:ss')} className='text-xs text-gray-500'>
                                                            {formatDate(inv.created)}
                                                        </span>
                                                        {inv.hostedInvoiceUrl && (
                                                            <div className='text-gray-400 hover:text-gray-600 transition-colors'>
                                                                <ExternalLink size={14} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
            </div>
        </Modal>
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
    const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
    const [config, setConfig] = useState<Awaited<ReturnType<typeof getPaymentConfig>> | null>(null);
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
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
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
            } catch (err) {
                failToast('Failed to load subscription settings');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const handleSelectPlan = async (tier: SubscriptionTier) => {
        if (!config) return;

        const priceId = config.prices[tier][billingCycle];
        if (!priceId) return failToast('Price not found for this plan configuration');

        setProcessingPlan(priceId);
        setSelectedPlan(tier);
        await startPaymentFlow(priceId);
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

    const handlePaymentSuccess = async () => {
        successToast('Subscription updated successfully!');
        closePaymentModal();

        const sub = await getSubscriptionDetails();
        updateSubscriptionTier(sub);
        setSubscription(sub as any);

        window.location.reload();
    };

    const closePaymentModal = useCallback(() => {
        setShowPaymentModal(false);
        setClientSecret(null);
        setProcessingPlan(null);
    }, []);

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

    const handleResumeSubscription = async () => {
        setCanceling(true);
        const res = await resumeSubscription();
        if (res.success) {
            successToast('Subscription will continue renewing automatically.');
            const sub = await getSubscriptionDetails();
            updateSubscriptionTier(sub);
            setSubscription(sub as any);
        } else {
            failToast(res.error || 'Failed to resume subscription');
        }
        setCanceling(false);
    };

    const handleApplyOneOffCoupon = async () => {
        if (!couponCode.trim()) return;
        setApplyingCoupon(true);
        try {
            const res = await applyOneOffCoupon(couponCode);
            if (res.success) {
                successToast(res.message);
                setCouponCode('');
                const sub = await getSubscriptionDetails();
                updateSubscriptionTier(sub);
                setSubscription(sub as any);
            } else {
                failToast(res.error || 'Failed to apply coupon');
            }
        } catch (err) {
            failToast('Failed to apply coupon');
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
    const hasPaidAccess = ['active', 'past_due'].includes(subscription?.subscriptionStatus || '') && periodDaysLeft > 0;
    const isActive = subscription?.subscriptionStatus === 'active' && periodDaysLeft > 0;
    const isPastDue = subscription?.subscriptionStatus === 'past_due' && periodDaysLeft > 0;

    return (
        <>
            <div className='space-y-8 max-w-4xl animate-in fade-in duration-500'>
                <div
                    className={cn(
                        'rounded-[14px] p-6 cursor-pointer',
                        isFrozen
                            ? 'sky-border pointer-events-none'
                            : subscription?.subscriptionTier === 'enterprise'
                              ? 'amber-border-hover bg-linear-to-br to-amber-500/20 from-amber-500/5'
                              : subscription?.subscriptionTier === 'professional'
                                ? 'violet-border-hover bg-linear-to-br to-violet-500/20 from-violet-500/5'
                                : subscription?.subscriptionTier === 'starter'
                                  ? 'sky-border-hover bg-linear-to-br to-sky-500/20 from-sky-500/5'
                                  : '',
                    )}
                    onClick={() => {
                        if (!isFrozen) setShowDetailsModal(true);
                    }}
                    role='button'
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
                                {subscription?.hasPaymentMethod && !isFrozen && (
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
                                    <span className='text-sm font-bold'>
                                        {daysLeft} day{daysLeft === 1 ? '' : 's'} remaining in free trial
                                    </span>
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
                                        {periodDaysLeft} day{periodDaysLeft === 1 ? '' : 's'} remaining this {subscription?.subscriptionInterval === 'year' ? 'year' : 'month'}
                                    </span>
                                </div>
                            )}
                            {isPastDue && (
                                <div className='flex items-center gap-2 px-3 py-1 rounded-full w-fit text-amber-700 bg-amber-500/10'>
                                    <AlertCircle size={16} />
                                    <span className='text-sm font-bold'>Payment issue detected. Please update your card or plan.</span>
                                </div>
                            )}
                            {!isTrial && !isActive && subscription?.subscriptionStatus === 'active' && (
                                <div
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-1 rounded-full w-fit',
                                        subscription?.subscriptionTier === 'enterprise'
                                            ? 'text-amber-600 bg-amber-500/10'
                                            : subscription?.subscriptionTier === 'professional'
                                              ? 'text-violet-600 bg-violet-500/10'
                                              : subscription?.subscriptionTier === 'starter'
                                                ? 'text-sky-600 bg-sky-500/10'
                                                : 'text-amber-600 bg-amber-500/10',
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
                                        subscription?.subscriptionTier === plan.name &&
                                            billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') &&
                                            !isFrozen &&
                                            !isTrial &&
                                            'pointer-events-none',
                                    )}
                                    onClick={() => {
                                        if (
                                            subscription?.subscriptionTier === plan.name &&
                                            billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') &&
                                            !isFrozen &&
                                            !isTrial
                                        )
                                            return;

                                        handleSelectPlan(plan.name as SubscriptionTier);
                                    }}
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
                                                !isFrozen &&
                                                !isTrial
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
                                                !isFrozen &&
                                                !isTrial
                                                ? 'translate-[2.5px_2.5px_0] shadow-none!'
                                                : subscription?.subscriptionTier === plan.name && !isFrozen && !isTrial
                                                  ? plan.name === 'starter'
                                                      ? 'bg-sky-500/10'
                                                      : plan.name === 'professional'
                                                        ? 'bg-violet-500/10'
                                                        : 'bg-amber-500/10'
                                                  : subscription?.subscriptionTier === plan.name && !isFrozen && isTrial
                                                    ? plan.name === 'starter'
                                                        ? 'bg-sky-50'
                                                        : plan.name === 'professional'
                                                          ? 'bg-violet-50'
                                                          : 'bg-amber-50'
                                                    : '',
                                        )}
                                    >
                                        {subscription?.subscriptionTier === plan.name &&
                                        billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') &&
                                        !isFrozen &&
                                        !isTrial
                                            ? 'Current Plan'
                                            : subscription?.subscriptionTier === plan.name &&
                                                billingCycle === (subscription?.subscriptionInterval === 'year' ? 'yearly' : 'monthly') &&
                                                !isFrozen &&
                                                isTrial
                                              ? 'Activate Plan'
                                              : subscription?.subscriptionTier === plan.name && !isFrozen
                                                ? `${isTrial ? 'Activate' : 'Switch to'} ${subscription?.subscriptionInterval === 'year' ? 'Monthly' : 'Yearly'} Plan`
                                                : 'Select Plan'}
                                    </button>
                                </div>
                            );
                        })}
                        {(hasPaidAccess || isTrial) && !subscription?.cancelAtPeriodEnd && (
                            <div className='flex flex-col gap-4 mt-4'>
                                <div className='bg-primary/5 border border-primary/20 rounded-[14px] p-4 flex flex-col gap-2'>
                                    <label className='text-sm font-bold text-gray-700 font-figtree'>Have a special promo code?</label>
                                    <div className='flex gap-2 w-full'>
                                        <input
                                            type='text'
                                            placeholder='Enter code...'
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleApplyOneOffCoupon();
                                            }}
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
                        {(hasPaidAccess || isTrial) && subscription?.cancelAtPeriodEnd && (
                            <button
                                onClick={handleResumeSubscription}
                                type='button'
                                disabled={canceling}
                                className='text-background cursor-pointer text-lg font-bold font-figtree bg-primary-light primary-border-hover rounded-[10px] px-2 py-2 flex justify-center items-center'
                            >
                                {canceling ? <Loader2 size={24} className='animate-spin' /> : 'Keep Subscription Active'}
                            </button>
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
                                            fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap', }],
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
                                            selectedPriceId={processingPlan ?? ''}
                                            onSuccess={handlePaymentSuccess}
                                            onCancel={() => {
                                                closePaymentModal();
                                            }}
                                        />
                                    </Elements>
                                </div>

                                {/* Right Side: Order Summary */}
                                <div className='w-full @min-[650px]/payment-window:w-72 bg-gray-50 rounded-xl p-5 border border-gray-200 h-fit'>
                                    <h4 className='text-lg font-bold text-gray-900 mb-4'>Order Summary</h4>
                                    <div className='space-y-3'>
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
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <SubscriptionDetailsModal open={showDetailsModal} onClose={() => setShowDetailsModal(false)} stripePromise={stripePromise} />
        </>
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
