'use client';

import { useEffect, useState } from 'react';

import DashboardSidebar from '../DashboardSidebar';
import { UserRole } from '../../Dashboard';
import DashboardHome from '../DashboardHome';
import { Session } from 'next-auth';
import Services from './Services';
import Settings from '../Settings';
import Team from '../Team';
import { getPublicID } from '@/app/actions/getPublicID';
import Relations from '../Relations';
import Calendar from '../_calendar/Calendar';
import Tasks from '../_tasks/Tasks';
import Invoices from '../_invoices/Invoices';

type Tab = 'profile' | 'account' | 'payments' | 'notifications';

const BraiderDashboard = ({ session, loading, update }: { session: Session | null; loading: boolean; update: (data?: any) => Promise<Session | null> }) => {
    const [selectedPage, setSelectedPage] = useState('Dashboard');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [image, setImage] = useState('');
    const [publicID, setPublicID] = useState('');
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

    useEffect(() => {
        const fetchPublicID = async () => {
            if (email.length > 0) {
                const publicID = await getPublicID(email);
                if (typeof publicID === 'string' && publicID.length > 0) setPublicID(publicID);
            }
        };

        fetchPublicID();
    }, [email]);

    const renderContent = () => {
        switch (selectedPage) {
            case 'Dashboard':
                return <DashboardHome role='braider' name={name} userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Calendar':
                return <Calendar role='braider' userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Tasks':
                return <Tasks role='braider' userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Barns':
                return <Relations userEmail={email} role='braider' userPublicID={publicID} setSelectedPage={setSelectedPage} />;
            case 'Invoices':
                return <Invoices role='braider' userEmail={email} setView={setSelectedPage} setSettingsModalOpen={(open) => setSelectedPage('Settings')} />;
            case 'Pricing':
                return <Services userEmail={email} />;
            case 'Team':
                return <Team userEmail={email} role='braider' userPublicID={publicID} setSelectedPage={setSelectedPage} />;
            case 'Settings':
                return <Settings update={update} role='braider' setUnsavedChanges={setUnsavedChanges} activeTab={activeTab} setActiveTab={setActiveTab} />;
            default:
                return <DashboardHome role='braider' name={name} userEmail={email} setSelectedPage={setSelectedPage} />;
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
                dashboard='braider'
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

export default BraiderDashboard;
