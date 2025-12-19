'use server';

import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        }),
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function getServices(email: string) {
    if (!email) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { services: true },
        });
        return user?.services || [];
    } catch (error) {
        console.error('Failed to fetch services:', error);
        return [];
    }
}

export async function addService(formData: any) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return { error: 'Unauthorized' };
    }

    const name = formData.name as string;
    const category = formData.category as string;
    const price = parseFloat(formData.price as string);
    const duration = formData.duration ? parseFloat(formData.duration as string) : null;

    if (!name || !price) {
        return { error: 'Missing required fields' };
    }

    try {
        await prisma.service.create({
            data: {
                user: { connect: { email: session.user.email } },
                name,
                category: category || 'Unspecified',
                priceUSD: price,
                duration: duration,
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to add service:', error);
        return { error: 'Failed to add service' };
    }
}

export async function editService(data: any, serviceId: string) {
    const session = await getServerSession(authOptions);

    if (!data.name && !data.category && !data.priceUSD && !data.duration) return { error: 'Send a field to update' };

    if (!session || !session.user?.email) {
        return { error: 'Unauthorized' };
    }

    if (data.duration === 'null') data.duration = null;

    try {
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: { user: true },
        });

        if (!service || service.user.email !== session.user.email) {
            return { error: 'Unauthorized' };
        }

        await prisma.service.update({
            where: { id: serviceId },
            data,
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to edit service' };
    }
}

export async function deleteService(serviceId: string) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return { error: 'Unauthorized' };
    }

    try {
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: { user: true },
        });

        if (!service || service.user.email !== session.user.email) {
            return { error: 'Unauthorized' };
        }

        await prisma.service.delete({
            where: { id: serviceId },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to delete service' };
    }
}
