'use server';

import { prisma } from '@/lib/prisma';

export async function getPublicID(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
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
