import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        }),
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function generateUniquePublicID(baseName: string | null | undefined, email: string | null | undefined): Promise<string> {
    let base = '';
    
    if (baseName) {
        base = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else if (email) {
        base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    } else {
        base = 'user';
    }
    
    if (base.length < 3) base = base.padEnd(3, 'x');

    let candidate = base;
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
        const existing = await prisma.user.findUnique({
            where: { publicID: candidate }
        });

        if (!existing) {
            isUnique = true;
        } else {
            candidate = `${base}${counter}`;
            counter++;
        }
    }

    return candidate;
}