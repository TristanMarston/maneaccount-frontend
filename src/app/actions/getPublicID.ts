'use server';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        }),
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
