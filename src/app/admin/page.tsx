'use client';

import { SessionProvider } from 'next-auth/react';
import AdminDashboard from './AdminDashboard';

const page = () => {
    return (
        <SessionProvider>
            <AdminDashboard />
        </SessionProvider>
    );
};

export default page;
