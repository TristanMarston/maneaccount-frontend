'use client';

import { SessionProvider } from 'next-auth/react';
import SignInPage from './SignInPage';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Toaster } from 'react-hot-toast';

const page = () => {
    return (
        <>
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
            <Suspense fallback={<></>}>
                <SessionProvider>
                    <SignInPage />
                </SessionProvider>
            </Suspense>
        </>
    );
};

export default page;
