'use client';

import { useEffect, useState } from 'react';

import DashboardSidebar from '../DashboardSidebar';
import { UserRole } from '../../Dashboard';
import DashboardHome from '../DashboardHome';
import { Session } from 'next-auth';
import Services from './Services';
import Team from '../Team';
import { getPublicID } from '@/app/actions/getPublicID';
import Relations from '../Relations';

const BraiderDashboard = ({ session, loading, update }: { session: Session | null; loading: boolean; update: (data?: any) => Promise<Session | null> }) => {
    const [selectedPage, setSelectedPage] = useState('Dashboard');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>('braider');
    const [email, setEmail] = useState('');
    const [image, setImage] = useState('');
    const [publicID, setPublicID] = useState('');

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
                return <DashboardHome role={role} name={name} />;
            case 'Horses':
                return (
                    <div className='p-8'>
                        <h1 className='text-2xl font-bold'>Horses View Coming Soon</h1>
                    </div>
                );
            case 'Calendar':
                return (
                    <div className='p-8'>
                        <h1 className='text-2xl font-bold'>Calendar View Coming Soon</h1>
                    </div>
                );
            case 'Clients':
                return <Relations userEmail={email} role='braider' userPublicID={publicID} setSelectedPage={setSelectedPage} />;
            case 'Invoices':
                return (
                    <div className='p-8'>
                        <h1 className='text-2xl font-bold'>Invoices View Coming Soon</h1>
                    </div>
                );
            case 'Pricing':
                return <Services userEmail={email} />;
            case 'Team':
                return <Team userEmail={email} role='braider' userPublicID={publicID} setSelectedPage={setSelectedPage} />;
            default:
                return <DashboardHome role={role} name={name} />;
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
                dashboard='braider'
                name={name}
                image={image}
                session={session}
                update={update}
                loading={loading}
                selectedPage={selectedPage}
                setSelectedPage={setSelectedPage}
            />
            <main className='flex-1 h-full overflow-y-auto bg-stone-50 dashboard-sm:rounded-r-[18px]'>{renderContent()}</main>
        </div>
    );
};

export default BraiderDashboard;
