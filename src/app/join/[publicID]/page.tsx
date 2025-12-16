'use client';

import { SessionProvider } from 'next-auth/react';
import Join from './Join';
import React, { Suspense } from 'react';

const page = ({ params }: { params: Promise<{ publicID: string }> }) => {
    const { publicID } = React.use(params);

    return (
        <Suspense fallback={<></>}>
            <SessionProvider>
                <Join inviterID={publicID} />
            </SessionProvider>
        </Suspense>
    );
};

export default page;
