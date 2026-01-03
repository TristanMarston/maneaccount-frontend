import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { cache } from 'react';

export const auth = cache(async () => {
    return await getServerSession(authOptions);
});
