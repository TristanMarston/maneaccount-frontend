'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BraiderDashboard from './_components/_braider/BraiderDashboard';
import SubcontractorDashboard from './_components/_subcontractor/SubcontractorDashboard';
import BarnDashboard from './_components/_owner/BarnDashboard';
import { GradientBackground } from '../_components/GradientBackground';
import { establishConnection } from '../actions/join';

export type UserRole = 'barn' | 'subcontractor' | 'braider' | 'admin' | '';

const Dashboard = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const {
        data: session,
        status,
        update,
    } = useSession({
        required: true,
        onUnauthenticated() {
            router.push('/login?mode=signin');
        },
    });
    const [role, setRole] = useState<UserRole>('');

    useEffect(() => {
        const validateConnection = async (email: string) => {
            const cookieStore = document.cookie;
            const joinValue = `; ${cookieStore}`;
            const joinCookie = joinValue.split(`; ${'join_request_user'}`);
            const targetPublicID = joinCookie.length === 2 ? joinCookie.pop()?.split(';').shift() : undefined;

            if (targetPublicID) establishConnection(email);
        };

        if (status === 'authenticated' && session) {
            setLoading(false);
            const userRole = session.user?.role;
            if (userRole === 'admin') router.push('/admin');
            else if (userRole.length > 0) setRole(userRole as UserRole);
            if (session.user?.email) validateConnection(session.user.email);
        }
    }, [session, status]);

    return !loading && session && role.length > 0 ? (
        <GradientBackground
            gradient='from-primary-dark/50 via-primary/50 to-primary-light/50'
            animated={false}
            className='flex flex-col items-center justify-center fixed inset-0 h-dvh overflow-hidden dashboard-sm:p-3 3xl:p-4'
        >
            {role === 'braider' ? (
                <BraiderDashboard session={session} loading={loading} update={update} />
            ) : role === 'subcontractor' ? (
                <SubcontractorDashboard session={session} loading={loading} update={update} />
            ) : (
                role === 'barn' && <BarnDashboard session={session} loading={loading} update={update} />
            )}
        </GradientBackground>
    ) : (
        <span className='loader'></span>
    );
};

export default Dashboard;
