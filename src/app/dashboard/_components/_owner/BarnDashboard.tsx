'use client';

import { useEffect, useState } from 'react';

import DashboardSidebar from '../DashboardSidebar';
import { UserRole } from '../../Dashboard';
import DashboardHome from '../DashboardHome';
import { Session } from 'next-auth';
import Horses from './Horses';
import Relations from '../Relations';
import { getPublicID } from '@/app/actions/getPublicID';
import Calendar from '../_calendar/Calendar';
import Services from '../_braider/Services';
import Invoices from '../_invoices/Invoices';
import Settings from '../Settings';
import Tasks from '../_tasks/Tasks';

type Tab = 'profile' | 'account' | 'payments' | 'notifications';

const BarnDashboard = ({ session, loading, update }: { session: Session | null; loading: boolean; update: (data?: any) => Promise<Session | null> }) => {
    const [selectedPage, setSelectedPage] = useState('Dashboard');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [image, setImage] = useState('');
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('profile');

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

    const renderContent = () => {
        switch (selectedPage) {
            case 'Dashboard':
                return <DashboardHome role='barn' name={name} userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Horses':
                return <Horses userEmail={email} />;
            case 'Braiders':
                return <Relations userEmail={email} role='barn' userPublicID='' setSelectedPage={setSelectedPage} />;
            case 'Calendar':
                return <Calendar role='barn' userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Services':
                return <Tasks role='barn' userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Invoices':
                return <Invoices role='barn' userEmail={email} setView={setSelectedPage} setSettingsModalOpen={(open) => setSelectedPage('Settings')} />;
            case 'Settings':
                return <Settings update={update} role='barn' setUnsavedChanges={setUnsavedChanges} activeTab={activeTab} setActiveTab={setActiveTab} />;
            default:
                return <DashboardHome role='barn' name={name} userEmail={email} setSelectedPage={setSelectedPage} />;
        }
    };

    if (loading)
        return (
            <div className='w-screen h-screen flex items-center justify-center bg-stone-50'>
                <span className='loader'></span>
            </div>
        );

    return (
        <div className='w-full min-h-full flex bg-stone-50/50 dashboard-sm:rounded-[18px] dashboard-sm:shadow-xl'>
            <DashboardSidebar
                dashboard='barn'
                name={name}
                image={image}
                session={session}
                update={update}
                loading={loading}
                selectedPage={selectedPage}
                setSelectedPage={setSelectedPage}
                unsavedChanges={unsavedChanges}
            />

            <main className='flex-1 h-full overflow-y-auto hide-scrollbar bg-stone-50 dashboard-sm:rounded-r-[18px] @container/content'>{renderContent()}</main>
        </div>
    );
};

export default BarnDashboard;
