'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BraiderDashboard from './_components/_braider/BraiderDashboard';
import SubcontractorDashboard from './_components/_subcontractor/SubcontractorDashboard';
import BarnDashboard from './_components/_owner/BarnDashboard';
import { GradientBackground } from '../_components/GradientBackground';
import { establishConnection } from '../actions/join';
import { failToast, successToast } from '../context';

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
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('google_connected') === 'true') {
            const { successToast } = require('@/app/context');
            successToast('Google Account Connected Successfully!');
            urlParams.delete('google_connected');
            router.replace(window.location.pathname + '?' + urlParams.toString());
        }

        const error = urlParams.get('error');
        if (error) {
            const { failToast } = require('@/app/context');
            if (error === 'OAuthAccountNotLinked') {
                failToast('This Google account is already linked to another ManeAccount profile.');
            } else {
                failToast(error);
            }
            urlParams.delete('error');
            router.replace(window.location.pathname + '?' + urlParams.toString());
        }

        const validateConnection = async (userId: string) => {
            const cookieStore = document.cookie;
            const joinValue = `; ${cookieStore}`;
            const joinCookie = joinValue.split(`; ${'join_request_user'}`);
            const targetPublicID = joinCookie.length === 2 ? joinCookie.pop()?.split(';').shift() : undefined;

            if (targetPublicID) {
                const res = await establishConnection(userId);
                if (res && res.success) {
                    successToast('User invited successfully!');
                } else if (res && res.error !== 'Existing connection') {
                    failToast('Failed to invite user');
                }
            }
        };

        if (status === 'authenticated' && session) {
            const userRole = session.user?.role;
            if (userRole !== 'braider') setLoading(false);
            if (userRole === 'admin') router.push('/admin');
            else if (userRole.length > 0) setRole(userRole as UserRole);
            if (session.user?.id) validateConnection(session.user.id);
        }
    }, [session, status, router]);

    return session && role.length > 0 ? (
        <GradientBackground
            gradient='from-primary-dark/50 via-primary/50 to-primary-light/50'
            animated={false}
            className='flex flex-col items-center justify-center fixed inset-0 h-dvh overflow-hidden dashboard-sm:p-3 3xl:p-4'
        >
            {role === 'braider' ? (
                <BraiderDashboard session={session} loading={loading} update={update} setLoading={setLoading} />
            ) : !loading && role === 'subcontractor' ? (
                <SubcontractorDashboard session={session} loading={loading} update={update} />
            ) : (
                !loading && role === 'barn' && <BarnDashboard session={session} loading={loading} update={update} />
            )}
            {loading && <span className='loader'></span>}
        </GradientBackground>
    ) : (
        <span className='loader'></span>
    );
};

export default Dashboard;
