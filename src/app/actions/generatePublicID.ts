import { prisma } from '@/lib/prisma';

export async function generateUniquePublicID(baseName: string | null | undefined, email: string | null | undefined): Promise<string> {
    let base = '';

    if (baseName) {
        base = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else if (email) {
        base = email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    } else {
        base = 'user';
    }

    if (base.length < 3) base = base.padEnd(3, 'x');

    let candidate = base;
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
        const existing = await prisma.user.findMany({
            where: { publicID: candidate },
            select: { id: true },
            take: 1,
        });

        if (existing.length === 0) {
            isUnique = true;
        } else {
            candidate = `${base}${counter}`;
            counter++;
        }
    }

    return candidate;
}
