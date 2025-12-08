'use client';

import { SessionProvider } from 'next-auth/react';
import SignInPage from './SignInPage';
import { Suspense } from 'react';

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
