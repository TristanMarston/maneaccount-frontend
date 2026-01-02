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
import Tasks from '../_tasks/Tasks';
import Invoices from '../_invoices/Invoices';

const OwnerDashboard = ({ session, loading, update }: { session: Session | null; loading: boolean; update: (data?: any) => Promise<Session | null> }) => {
    const [selectedPage, setSelectedPage] = useState('Dashboard');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>('client');
    const [email, setEmail] = useState('');
    const [image, setImage] = useState('');
    const [publicID, setPublicID] = useState('');
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);

    useEffect(() => {
        if (session?.user) {
            setName(session.user.name || 'User');
            setEmail(session.user.email || '');
            setImage(session.user.image || '');

            if (session.user.role) {
                setRole(session.user.role as UserRole);
            }
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
                return <DashboardHome role={role} name={name} userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Horses':
                return <Horses userEmail={email} />;
            case 'Braiders':
                return <Relations userEmail={email} role='client' userPublicID={publicID} setSelectedPage={setSelectedPage} />;
            case 'Calendar':
                return <Calendar role={role} userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Services':
                return <Tasks role={role} userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Invoices':
                return <Invoices role={role} userEmail={email} setView={setSelectedPage} setSettingsModalOpen={setSettingsModalOpen} />;
            default:
                return <DashboardHome role={role} name={name} userEmail={email} setSelectedPage={setSelectedPage} />;
        }
    };

    if (loading)
        return (
            <div className='w-screen h-screen flex items-center justify-center bg-stone-50'>
                <span className='loader'></span>
            </div>
        );

    return (
        <div className='w-full min-h-full flex bg-stone-50/50 dashboard-sm:rounded-[18px] dashboard-sm:shadow-lg'>
            <DashboardSidebar
                dashboard='client'
                name={name}
                image={image}
                session={session}
                update={update}
                loading={loading}
                selectedPage={selectedPage}
                setSelectedPage={setSelectedPage}
                settingsModalOpen={settingsModalOpen}
                setSettingsModalOpen={setSettingsModalOpen}
            />

            <main className='flex-1 h-full overflow-y-auto bg-stone-50 dashboard-sm:rounded-r-[18px] @container/content'>{renderContent()}</main>
        </div>
    );
};

export default OwnerDashboard;
