'use client';

import { useEffect, useState } from 'react';
import DashboardSidebar from '../DashboardSidebar';
import { Session } from 'next-auth';
import DashboardHome from '../DashboardHome';
import { UserRole } from '../../Dashboard';
import Team from '../Team';
import { getPublicID } from '@/app/actions/getPublicID';
import Calendar from '../_calendar/Calendar';

const SubcontractorDashboard = ({ session, loading, update }: { session: Session | null; loading: boolean; update: (data?: any) => Promise<Session | null> }) => {
    const [selectedPage, setSelectedPage] = useState('Dashboard');
    const [name, setName] = useState('');
    const [image, setImage] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>('');
    const [publicID, setPublicID] = useState('');

    useEffect(() => {
        if (session) {
            setName(session.user?.name || '');
            setImage(session.user?.image || '');
            setEmail(session.user?.email || '');

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
                return <DashboardHome role={role} name={name} />;
            case 'Calendar':
                return <Calendar role={role} userEmail={email} />;
            case 'Clients':
                return (
                    <div className='p-8'>
                        <h1 className='text-2xl font-bold'>Clients View Coming Soon</h1>
                    </div>
                );
            case 'Invoices':
                return (
                    <div className='p-8'>
                        <h1 className='text-2xl font-bold'>Invoices View Coming Soon</h1>
                    </div>
                );
            case 'Team':
                return <Team userEmail={email} role='subcontractor' userPublicID={publicID} setSelectedPage={setSelectedPage} />;
            default:
                return <DashboardHome role={role} name={name} />;
        }
    };

    return (
        <div className='w-full min-h-full flex bg-stone-50/50 dashboard-sm:rounded-[18px] dashboard-sm:shadow-lg'>
            <DashboardSidebar
                dashboard='subcontractor'
                name={name}
                image={image}
                session={session}
                update={update}
                loading={loading}
                selectedPage={selectedPage}
                setSelectedPage={setSelectedPage}
            />
            <main className='flex-1 h-full overflow-y-auto bg-stone-50 dashboard-sm:rounded-r-[18px] @container/content'>{renderContent()}</main>
        </div>
    );
};

export default SubcontractorDashboard;
