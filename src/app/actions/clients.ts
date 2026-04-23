'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getClients(userId: string) {
    if (!userId) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { clients: { include: { horses: true } } },
        });
        return user?.clients || [];
    } catch (error) {
        console.error('Failed to fetch clients:', error);
        return [];
    }
}

export async function addClient(formData: any) {
    const session = await auth();

    if (!session || !session.user?.email) {
        return { error: 'Unauthorized' };
    }

    const name = formData.name as string;
    const email = formData.email as string;
    const phoneNumber = formData.phoneNumber as string;

    if (!name || !email) {
        return { error: 'Missing required fields' };
    }

    try {
        const client = await prisma.client.create({
            data: {
                barn: { connect: { id: session.user.id } },
                name,
                email,
                phoneNumber: phoneNumber || null,
            },
        });

        revalidatePath('/dashboard');
        return { success: true, id: client.id };
    } catch (error) {
        console.error('Failed to add client:', error);
        return { error: 'Failed to add client' };
    }
}

export async function editClient(data: any, clientId: string) {
    const session = await auth();

    if (!session || !session.user?.email) {
        return { error: 'Unauthorized' };
    }

    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: { barn: true },
        });

        if (!client || client.barn.email !== session.user.email) {
            return { error: 'Unauthorized' };
        }

        await prisma.client.update({
            where: { id: clientId },
            data,
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to edit client:', error);
        return { error: 'Failed to edit client' };
    }
}

export async function deleteClient(clientId: string) {
    const session = await auth();

    if (!session || !session.user?.email) {
        return { error: 'Unauthorized' };
    }

    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: { barn: true },
        });

        if (!client || client.barn.email !== session.user.email) {
            return { error: 'Unauthorized' };
        }

        await prisma.horse.deleteMany({
            where: { clientId },
        });

        await prisma.client.delete({
            where: { id: clientId },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete client:', error);
        return { error: 'Failed to delete client' };
    }
}
