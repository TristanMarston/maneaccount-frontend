'use client';

import { useEffect, useState } from 'react';

import DashboardSidebar from '../DashboardSidebar';
import { UserRole } from '../../Dashboard';
import DashboardHome from '../DashboardHome';
import { Session } from 'next-auth';
import Services from './Services';
import Settings from '../_settings/Settings';
import Team from '../Team';
import { getPublicID } from '@/app/actions/getPublicID';
import Relations from '../Relations';
import Calendar from '../_calendar/Calendar';
import Tasks from '../_tasks/Tasks';
import Invoices from '../_invoices/Invoices';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { getSubscriptionDetails, startFreeTrial } from '@/app/actions/billing';
import { cn } from '@/lib/utils';

export type Tab = 'profile' | 'account' | 'invoicing' | 'notifications' | 'subscription';

const BraiderDashboard = ({
    session,
    loading,
    update,
    setLoading,
}: {
    session: Session | null;
    loading: boolean;
    update: (data?: any) => Promise<Session | null>;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const [selectedPage, setSelectedPage] = useState('Dashboard');
    const [userId, setUserId] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [image, setImage] = useState('');
    const [publicID, setPublicID] = useState('');
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [isFrozen, setIsFrozen] = useState(false);
    const [subscription, setSubscription] = useState<{
        subscriptionTier: SubscriptionTier;
        subscriptionStatus: SubscriptionStatus;
        trialEndsAt: Date | null;
        currentPeriodEnd: Date | null;
        stripeCustomerId: string | null;
        subscriptionInterval: string;
    } | null>(null);

    useEffect(() => {
        setUnsavedChanges(false);
    }, [selectedPage]);

    useEffect(() => {
        if (session?.user) {
            setUserId(session.user.id || '');
            setName(session.user.name || 'User');
            setEmail(session.user.email || '');
            setImage(session.user.image || '');
        }
    }, [session]);

    useEffect(() => {
        const fetchPublicID = async () => {
            if (userId.length > 0) {
                const publicID = await getPublicID(userId);
                if (typeof publicID === 'string' && publicID.length > 0) setPublicID(publicID);
            }
        };

        fetchPublicID();
    }, [userId]);

    const hasSubscriptionAccess = (subscriptionDetails: {
        subscriptionStatus: SubscriptionStatus;
        trialEndsAt: Date | null;
        currentPeriodEnd: Date | null;
    }) => {
        const now = new Date();
        const trialEndsAtDate = subscriptionDetails.trialEndsAt ? new Date(subscriptionDetails.trialEndsAt) : null;
        const currentPeriodEndDate = subscriptionDetails.currentPeriodEnd ? new Date(subscriptionDetails.currentPeriodEnd) : null;
        const isTrial =
            subscriptionDetails.subscriptionStatus === 'trialing' && !!trialEndsAtDate && Math.ceil((trialEndsAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) > 0;
        const isPaidWindow =
            ['active', 'past_due'].includes(subscriptionDetails.subscriptionStatus) &&
            !!currentPeriodEndDate &&
            Math.ceil((currentPeriodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) > 0;

        return isTrial || isPaidWindow;
    };

    const fetchSubscriptionDetails = async () => {
        if (email.length > 0) {
            const subscriptionDetails = await getSubscriptionDetails();
            if (subscriptionDetails) {
                setSubscription(subscriptionDetails);
                setIsFrozen(!hasSubscriptionAccess(subscriptionDetails));
            }
        }
    };

    useEffect(() => {
        const getDetails = async () => {
            setLoading(true);
            await fetchSubscriptionDetails();
            setLoading(false);
        };

        getDetails();
    }, [email]);

    useEffect(() => {
        if (isFrozen) setActiveTab('subscription');
    }, [isFrozen]);

    const beginFreeTrial = async () => {
        const response = await startFreeTrial();

        if (response.success) {
            await fetchSubscriptionDetails();
        } else {
            console.error('Error starting free trial:', response.error);
        }
    };

    const renderContent = () => {
        switch (selectedPage) {
            case 'Dashboard':
                return (
                    <DashboardHome
                        role='braider'
                        name={name}
                        userEmail={email}
                        setSelectedPage={setSelectedPage}
                        setSettingsOpen={(page: Tab) => {
                            setSelectedPage('Settings');
                            setActiveTab(page);
                        }}
                        isFrozen={isFrozen}
                    />
                );
            case 'Calendar':
                return <Calendar key='braider-calendar' role='braider' userId={userId} setSelectedPage={setSelectedPage} />;
            case 'Tasks':
                return (
                    <Tasks
                        role='braider'
                        userEmail={email}
                        userId={userId}
                        setSelectedPage={setSelectedPage}
                        subscriptionTier={subscription?.subscriptionTier}
                        setSettingsOpen={(page: Tab) => {
                            setSelectedPage('Settings');
                            setActiveTab(page);
                        }}
                    />
                );
            case 'Barns':
                return (
                    <Relations
                        userId={userId}
                        role='braider'
                        userPublicID={publicID}
                        setSelectedPage={setSelectedPage}
                        canInviteSubcontractors={subscription?.subscriptionTier !== 'starter'}
                    />
                );
            case 'Invoices':
                return (
                    <Invoices
                        role='braider'
                        userId={userId}
                        setView={setSelectedPage}
                        setSettingsOpen={(page: Tab) => {
                            setSelectedPage('Settings');
                            setActiveTab(page);
                        }}
                    />
                );
            case 'Pricing':
                return <Services userId={userId} />;
            case 'Team':
                return <Team userId={userId} role='braider' userPublicID={publicID} setSelectedPage={setSelectedPage} subscriptionTier={subscription?.subscriptionTier} />;
            case 'Settings':
                return (
                    <Settings
                        update={update}
                        updateSubscriptionTier={(
                            sub: {
                                subscriptionTier: SubscriptionTier;
                                subscriptionStatus: SubscriptionStatus;
                                trialEndsAt: Date | null;
                                currentPeriodEnd: Date | null;
                                stripeCustomerId: string | null;
                                subscriptionInterval: string;
                            } | null,
                        ) => {
                            setSubscription(sub);
                        }}
                        role='braider'
                        setUnsavedChanges={setUnsavedChanges}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        userEmail={email}
                        isFrozen={isFrozen}
                    />
                );
            default:
                return (
                    <DashboardHome
                        role='braider'
                        name={name}
                        userEmail={email}
                        setSelectedPage={setSelectedPage}
                        setSettingsOpen={(page: Tab) => {
                            setSelectedPage('Settings');
                            setActiveTab(page);
                        }}
                    />
                );
        }
    };

    return (
        !loading && (
            <>
                <div
                    className={cn(
                        'w-full min-h-full flex bg-stone-50/50 dashboard-sm:rounded-[18px] dashboard-sm:shadow-xl',
                        (!subscription?.stripeCustomerId && subscription) || (isFrozen && selectedPage !== 'Settings') ? 'opacity-20 pointer-events-none' : '',
                    )}
                >
                    <DashboardSidebar
                        dashboard='braider'
                        name={name}
                        image={image}
                        session={session}
                        update={update}
                        loading={loading}
                        selectedPage={selectedPage}
                        setSelectedPage={setSelectedPage}
                        unsavedChanges={unsavedChanges}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        subscriptionTier={subscription?.subscriptionTier}
                        isFrozen={isFrozen}
                    />
                    <main className='flex-1 h-full overflow-y-auto hide-scrollbar bg-stone-50 dashboard-sm:rounded-r-[18px] @container/content'>
                        {!subscription?.stripeCustomerId && subscription ? <></> : renderContent()}
                    </main>
                </div>
                {!subscription?.stripeCustomerId && subscription ? (
                    <div className='absolute top-1/2 left-1/2 transform font-figtree -translate-x-1/2 -translate-y-1/2 bg-background shadow-lg p-7 max-w-[450px] w-[90dvw] rounded-[14px]'>
                        <h3 className='font-bold font-lusitana text-4xl'>No Plan Selected</h3>
                        <p className='text-gray-500 mt-1'>You must select a plan to access your dashboard</p>
                        <button
                            onClick={() => beginFreeTrial()}
                            className='font-figtree px-4 py-2 cursor-pointer rounded-[10px] primary-border-hover mt-4 w-full text-background font-bold bg-primary-light'
                        >
                            Start Free Trial
                        </button>
                    </div>
                ) : isFrozen && selectedPage !== 'Settings' ? (
                    <div className='absolute top-1/2 left-1/2 transform font-figtree -translate-x-1/2 -translate-y-1/2 bg-background shadow-lg p-7 max-w-[450px] w-[90dvw] rounded-[14px]'>
                        <h3 className='font-bold font-lusitana text-4xl'>Account Frozen</h3>
                        <p className='text-gray-500 mt-1'>
                            You may not currently access your account because your subscription has ended. <br />
                            <br />
                            This means that you no longer have access to the application until you re-subscribe.
                        </p>
                        <button
                            onClick={() => {
                                setSelectedPage('Settings');
                                setActiveTab('subscription');
                            }}
                            className='font-figtree px-4 py-2 cursor-pointer rounded-[10px] primary-border-hover mt-4 w-full text-background font-bold bg-primary-light'
                        >
                            Manage Subscription
                        </button>
                    </div>
                ) : (
                    <></>
                )}
            </>
        )
    );
};

export default BraiderDashboard;
