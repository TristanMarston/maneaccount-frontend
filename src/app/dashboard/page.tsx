'use client';

import { SessionProvider } from 'next-auth/react';
import Dashboard from './Dashboard';
import { Toaster } from 'react-hot-toast';

const page = () => {
    return (
        <div>
            <Toaster
                toastOptions={{
                    success: {
                        iconTheme: {
                            primary: '#69a190',
                            secondary: '#ffffff',
                        },
                    },
                }}
            />
            <SessionProvider>
                <Dashboard />
            </SessionProvider>
        </div>
    );
};

export default page;
