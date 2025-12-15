'use server';

import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';
import { PrismaPg } from '@prisma/adapter-pg';
import { sendNotificationEmail } from '@/lib/email';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        }),
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function getUserByPublicID(publicID: string) {
    if (!publicID) return;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { publicID },
        });
        if (!user) return { error: 'User not found', success: false, user: undefined };

        return { error: undefined, success: true, user };
    } catch (error) {
        console.error(error);
        return { error: 'Failed to fetch user', success: false, user: undefined };
    }
}

export async function getTeamMembers(email: string) {
    if (!email) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                sentConnections: { include: { receiver: true } },
                receivedConnections: { include: { sender: true } },
            },
        });

        if (!user) return [];

        const sent = user.sentConnections
            .filter((c) => c.status === 'accepted' && c.receiver.role !== 'client')
            .map((c) => ({ ...c.receiver, connectionID: c.id, joinedAt: c.createdAt }));

        const received = user.receivedConnections
            .filter((c) => c.status === 'accepted' && c.sender.role !== 'client')
            .map((c) => ({ ...c.sender, connectionID: c.id, joinedAt: c.createdAt }));

        return [...sent, ...received];
    } catch (error) {
        console.error('Failed to fetch team:', error);
        return [];
    }
}

export async function getTeamRequests(email: string) {
    if (!email) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                sentConnections: { include: { receiver: true } },
                receivedConnections: { include: { sender: true } },
            },
        });

        if (!user) return [];

        const sent = user.sentConnections.filter((c) => c.status === 'pending').map((c) => ({ ...c.receiver, connectionID: c.id, joinedAt: c.createdAt }));

        const received = user.receivedConnections.filter((c) => c.status === 'pending').map((c) => ({ ...c.sender, connectionID: c.id, joinedAt: c.createdAt }));

        return [...sent, ...received];
    } catch (error) {
        console.error('Failed to fetch team:', error);
        return [];
    }
}

export async function getPendingRequests(email: string) {
    if (!email) return { incoming: [], outgoing: [] };

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                receivedConnections: {
                    where: { status: 'pending' },
                    include: { sender: true },
                },
                sentConnections: {
                    where: { status: 'pending' },
                    include: { receiver: true },
                },
            },
        });

        if (!user) return { incoming: [], outgoing: [] };

        const incoming = user.receivedConnections.map((c) => ({
            ...c.sender,
            connectionID: c.id,
            sentAt: c.createdAt,
        }));

        const outgoing = user.sentConnections.map((c) => ({
            ...c.receiver,
            connectionID: c.id,
            sentAt: c.createdAt,
        }));

        return { incoming, outgoing };
    } catch (error) {
        console.error('Failed to fetch pending requests:', error);
        return { incoming: [], outgoing: [] };
    }
}

export async function inviteUser(publicID: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const sender = await prisma.user.findUnique({
            where: { email: session.user.email },
        });
        if (!sender) return { error: 'User not found' };

        const receiver = await prisma.user.findUnique({
            where: { publicID: publicID.toLowerCase() },
        });
        if (!receiver) return { error: 'User not found with that ID' };

        if (sender.id === receiver.id) return { error: 'Cannot invite yourself' };

        const existing = await prisma.connection.findFirst({
            where: {
                OR: [
                    { senderId: sender.id, receiverId: receiver.id },
                    { senderId: receiver.id, receiverId: sender.id },
                ],
            },
        });

        if (existing) {
            return { error: existing.status === 'pending' ? 'Invitation already pending' : 'User already in team' };
        }

        // send an email here
        await prisma.connection.create({
            data: {
                senderId: sender.id,
                receiverId: receiver.id,
                status: 'pending',
            },
        });

        if (receiver.email) {
            await sendNotificationEmail({
                to: receiver.email,
                subject: `New Invite from ${sender.name}`,
                heading: 'You have a new connection request!',
                message: `${sender.name} (${sender.role.toLowerCase()}) wants to add you to their team on ManeAccount.`,
                actionLabel: 'View Dashboard',
                actionUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
            });
        }

        revalidatePath('/dashboard');
        return { success: true, message: `Invitation sent to ${receiver.name}` };
    } catch (error) {
        console.error('Invite error:', error);
        return { error: 'Failed to send invitation' };
    }
}

export async function acceptRequest(connectionID: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const connection = await prisma.connection.findUnique({
            where: { id: connectionID },
            include: { receiver: true },
        });

        if (!connection || connection.receiver.email !== session.user.email) {
            return { error: 'Unauthorized' };
        }

        await prisma.connection.update({
            where: { id: connectionID },
            data: { status: 'accepted' },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to accept request' };
    }
}

export async function removeMember(connectionID: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.connection.delete({
            where: { id: connectionID },
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to remove member' };
    }
}
