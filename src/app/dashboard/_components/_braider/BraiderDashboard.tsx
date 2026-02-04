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

export type Tab = 'profile' | 'account' | 'payments' | 'notifications' | 'subscription';

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
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [image, setImage] = useState('');
    const [publicID, setPublicID] = useState('');
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('profile');
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
            setName(session.user.name || 'User');
            setEmail(session.user.email || '');
            setImage(session.user.image || '');
        }
    }, [session]);

    useEffect(() => {
        const fetchPublicID = async () => {
            if (email.length > 0) {
                const publicID = await getPublicID(email);
                if (typeof publicID === 'string' && publicID.length > 0) setPublicID(publicID);
            }
        };

        fetchPublicID();
    }, [email]);

    const fetchSubscriptionDetails = async () => {
        if (email.length > 0) {
            const subscriptionDetails = await getSubscriptionDetails();
            if (subscriptionDetails) setSubscription(subscriptionDetails);
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
                return <DashboardHome role='braider' name={name} userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Calendar':
                return <Calendar role='braider' userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Tasks':
                return (
                    <Tasks
                        role='braider'
                        userEmail={email}
                        setSelectedPage={setSelectedPage}
                        subscriptionTier={subscription?.subscriptionTier}
                        setSettingsOpen={(page: Tab) => {
                            setSelectedPage('Settings');
                            setActiveTab(page);
                        }}
                    />
                );
            case 'Barns':
                return <Relations userEmail={email} role='braider' userPublicID={publicID} setSelectedPage={setSelectedPage} />;
            case 'Invoices':
                return (
                    <Invoices
                        role='braider'
                        userEmail={email}
                        setView={setSelectedPage}
                        setSettingsOpen={(page: Tab) => {
                            setSelectedPage('Settings');
                            setActiveTab(page);
                        }}
                    />
                );
            case 'Pricing':
                return <Services userEmail={email} />;
            case 'Team':
                return <Team userEmail={email} role='braider' userPublicID={publicID} setSelectedPage={setSelectedPage} subscriptionTier={subscription?.subscriptionTier} />;
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
                    />
                );
            default:
                return <DashboardHome role='braider' name={name} userEmail={email} setSelectedPage={setSelectedPage} />;
        }
    };

    return (
        !loading && (
            <>
                <div
                    className={cn(
                        'w-full min-h-full flex bg-stone-50/50 dashboard-sm:rounded-[18px] dashboard-sm:shadow-xl',
                        !subscription?.stripeCustomerId && subscription ? 'opacity-30 pointer-events-none' : '',
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
                    />
                    <main className='flex-1 h-full overflow-y-auto hide-scrollbar bg-stone-50 dashboard-sm:rounded-r-[18px] @container/content'>
                        {!subscription?.stripeCustomerId && subscription ? <></> : renderContent()}
                    </main>
                </div>
                {!subscription?.stripeCustomerId && subscription ? (
                    <div className='absolute top-1/2 left-1/2 transform font-figtree -translate-x-1/2 -translate-y-1/2 bg-background/70 shadow-lg p-8 rounded-[14px]'>
                        <h3 className='font-bold font-lusitana text-3xl'>No Plan Selected</h3>
                        <p className='text-gray-500'>You must select a plan to access your dashboard</p>
                        <button
                            onClick={() => beginFreeTrial()}
                            className='font-figtree px-4 py-2 cursor-pointer rounded-[10px] primary-border-hover mt-4 w-full text-background font-bold bg-primary-light'
                        >
                            Start free trial
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
