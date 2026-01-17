'use client';

import { useEffect, useState } from 'react';
import DashboardSidebar from '../DashboardSidebar';
import { Session } from 'next-auth';
import DashboardHome from '../DashboardHome';
import { UserRole } from '../../Dashboard';
import Team from '../Team';
import { getPublicID } from '@/app/actions/getPublicID';
import Calendar from '../_calendar/Calendar';
import Tasks from '../_tasks/Tasks';
import Settings from '../_settings/Settings';
import { Tab } from '../_braider/BraiderDashboard';

const SubcontractorDashboard = ({ session, loading, update }: { session: Session | null; loading: boolean; update: (data?: any) => Promise<Session | null> }) => {
    const [selectedPage, setSelectedPage] = useState('Dashboard');
    const [name, setName] = useState('');
    const [image, setImage] = useState('');
    const [email, setEmail] = useState('');
    const [publicID, setPublicID] = useState('');
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('profile');

    useEffect(() => {
        setUnsavedChanges(false);
    }, [selectedPage]);

    useEffect(() => {
        if (session?.user) {
            setName(session.user.name || 'User');
            setImage(session.user.image || '');
            setEmail(session.user.email || '');
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
                return <DashboardHome role='subcontractor' name={name} userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Calendar':
                return <Calendar role='subcontractor' userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Tasks':
                return <Tasks role='subcontractor' userEmail={email} setSelectedPage={setSelectedPage} />;
            case 'Team':
                return <Team userEmail={email} role='subcontractor' userPublicID={publicID} setSelectedPage={setSelectedPage} />;
            case 'Settings':
                return <Settings update={update} role='subcontractor' setUnsavedChanges={setUnsavedChanges} activeTab={activeTab} setActiveTab={setActiveTab} userEmail={email} />;
            default:
                return <DashboardHome role='subcontractor' name={name} userEmail={email} setSelectedPage={setSelectedPage} />;
        }
    };

    return (
        <div className='w-full min-h-full flex bg-stone-50/50 dashboard-sm:rounded-[18px] dashboard-sm:shadow-xl'>
            <DashboardSidebar
                dashboard='subcontractor'
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
            />
            <main className='flex-1 h-full overflow-y-auto hide-scrollbar bg-stone-50 dashboard-sm:rounded-r-[18px] @container/content'>{renderContent()}</main>
        </div>
    );
};

export default SubcontractorDashboard;
