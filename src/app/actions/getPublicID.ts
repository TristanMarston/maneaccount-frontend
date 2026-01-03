'use server';

import { prisma } from '@/lib/prisma';

export async function getPublicID(email: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                publicID: true,
            },
        });

        return user?.publicID ? user.publicID : '';
    } catch (error) {
        console.error('Failed to get publicID:', error);
        return { error: 'Failed to get publicID' };
    }
}
