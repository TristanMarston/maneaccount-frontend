'use client';

import { useEffect, useState } from 'react';
import DashboardSidebar from '../DashboardSidebar';
import { Session } from 'next-auth';

const SubcontractorDashboard = ({ session, loading, update }: { session: Session | null; loading: boolean; update: (data?: any) => Promise<Session | null> }) => {
    const [selectedPage, setSelectedPage] = useState('Dashboard');
    const [name, setName] = useState('');
    const [image, setImage] = useState('');

    useEffect(() => {
        if (session) {
            setName(session.user?.name || '');
            setImage(session.user?.image || '');
        }
    }, [session]);

    return (
        <div className='w-screen flex'>
            <DashboardSidebar dashboard='subcontractor' session={session} image={image} update={update} loading={loading} name={name} selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
        </div>
    );
};

export default SubcontractorDashboard;
