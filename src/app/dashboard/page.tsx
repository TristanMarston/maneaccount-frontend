'use client';

import { SessionProvider } from 'next-auth/react';
import Dashboard from './Dashboard';
import { Toaster } from 'react-hot-toast';

const page = () => {
    return (
        <div>
            <Toaster />
            <SessionProvider>
                <Dashboard />
            </SessionProvider>
        </div>
    )
}

export default page;