'use client';

import { SessionProvider } from 'next-auth/react';
import SignInPage from './SignInPage';

const page = () => {
    return (
        <SessionProvider>
            <SignInPage />
        </SessionProvider>
    );
};

export default page;
