'use client';

import { useEffect, useState } from 'react';
import DashboardSidebar from '../DashboardSidebar';
import { Session } from 'next-auth';

const SubcontractorDashboard = ({ session, loading }: { session: Session | null; loading: boolean }) => {
    const [selectedPage, setSelectedPage] = useState('Dashboard');
    const [name, setName] = useState('');

    useEffect(() => {
        if (session) {
            setName(session.user?.name || '');
        }
    }, [session])

    return (
        <div className='w-screen flex'>
            <DashboardSidebar dashboard='subcontractor' session={session} loading={loading} name={name} selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
        </div>
    );
};

export default SubcontractorDashboard;
