'use client';

import { SessionProvider } from 'next-auth/react';
import SignInPage from './SignInPage';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const page = () => {
    return (
        <Suspense fallback={<></>}>
            <SessionProvider>
                <SignInPage />
            </SessionProvider>
        </Suspense>
    );
};

export default page;
