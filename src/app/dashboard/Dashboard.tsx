'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BraiderDashboard from './_components/_braider/BraiderDashboard';
import SubcontractorDashboard from './_components/_subcontractor/SubcontractorDashboard';
import OwnerDashboard from './_components/_owner/OwnerDashboard';

export type UserRole = 'client' | 'subcontractor' | 'braider' | 'admin' | '';

const Dashboard = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            router.push('/login?mode=signin');
        },
    });
    const [role, setRole] = useState<UserRole>('');

    useEffect(() => {
        if (status === 'authenticated' && session) {
            setLoading(false);
            const userRole = session.user?.role;
            if (userRole === 'admin') router.push('/admin');
            else if (userRole.length > 0) setRole(userRole as UserRole);
        }
    }, [session, status]);

    return !loading && session && role.length > 0 ? (
        <>
            {role === 'braider' ? (
                <BraiderDashboard session={session} loading={loading} />
            ) : role === 'subcontractor' ? (
                <SubcontractorDashboard session={session} loading={loading} />
            ) : (
                role === 'client' && <OwnerDashboard session={session} loading={loading} />
            )}
        </>
    ) : (
        <span className='loader'></span>
    );
};

export default Dashboard;
