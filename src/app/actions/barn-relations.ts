'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { createNotification } from './notifications';
import { NotificationType } from '@prisma/client';

export async function getRelations(email: string) {
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

        const targetRole = user.role === 'barn' ? 'braider' : 'barn';

        // 1. Sent Connections (I invited them)
        const sent = user.sentConnections
            .filter((c) => c.status === 'accepted' && c.receiver.role === targetRole)
            .map((c) => ({ ...c.receiver, connectionID: c.id, joinedAt: c.createdAt }));

        // 2. Received Connections (They invited me)
        const received = user.receivedConnections
            .filter((c) => c.status === 'accepted' && c.sender.role === targetRole)
            .map((c) => ({ ...c.sender, connectionID: c.id, joinedAt: c.createdAt }));

        return [...sent, ...received];
    } catch (error) {
        console.error('Failed to fetch relations:', error);
        return [];
    }
}

export async function getPendingRelations(email: string) {
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

        const targetRole = user.role === 'barn' ? 'braider' : 'barn';

        const incoming = user.receivedConnections
            .filter((c) => c.sender.role === targetRole)
            .map((c) => ({
                ...c.sender,
                connectionID: c.id,
                sentAt: c.createdAt,
            }));

        const outgoing = user.sentConnections
            .filter((c) => c.receiver.role === targetRole)
            .map((c) => ({
                ...c.receiver,
                connectionID: c.id,
                sentAt: c.createdAt,
            }));

        return { incoming, outgoing };
    } catch (error) {
        console.error('Failed to fetch pending relations:', error);
        return { incoming: [], outgoing: [] };
    }
}

export async function inviteRelation(publicID: string) {
    const session = await auth();
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

        const validBraiderBarn = (sender.role === 'braider' && receiver.role === 'barn') || (sender.role === 'barn' && receiver.role === 'braider');

        if (!validBraiderBarn) {
            return { error: `You cannot add a ${receiver.role.toLowerCase()} here.` };
        }

        const existing = await prisma.connection.findFirst({
            where: {
                OR: [
                    { senderId: sender.id, receiverId: receiver.id },
                    { senderId: receiver.id, receiverId: sender.id },
                ],
            },
        });

        if (existing) {
            return { error: existing.status === 'pending' ? 'Invitation already pending' : 'User already connected' };
        }

        const connection = await prisma.connection.create({
            data: {
                senderId: sender.id,
                receiverId: receiver.id,
                status: 'pending',
            },
        });

        await createNotification(receiver.id, NotificationType.barn_invite, `${sender.name} sent you a connection request`, connection.id, sender.id, sender.image);

        revalidatePath('/dashboard');
        return { success: true, message: `Invitation sent to ${receiver.name}` };
    } catch (error) {
        console.error('Invite error:', error);
        return { error: 'Failed to send invitation' };
    }
}

export async function removeRelation(connectionId: string, rejected: boolean) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        if (rejected) {
            const connection = await prisma.connection.findUnique({ where: { id: connectionId }, include: { sender: true, receiver: true } });
            if (connection) {
                await createNotification(
                    connection.sender.id,
                    NotificationType.barn_status_change,
                    `${connection.receiver.name} rejected your connection request`,
                    null,
                    connection.receiver.id,
                    connection.receiver.image,
                );
            }
        }

        if (!rejected) await desyncCalendar(connectionId);

        await prisma.connection.delete({
            where: { id: connectionId },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to remove relation:', error);
        return { error: 'Failed to remove connection' };
    }
}

export async function desyncCalendar(connectionId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const connection = await prisma.connection.findUnique({ where: { id: connectionId }, include: { sender: true, receiver: true } });
        if (!connection) return { error: 'Connection not found' };

        await prisma.showInvite.deleteMany({
            where: {
                OR: [
                    { inviterId: connection.senderId, inviteeId: connection.receiverId },
                    { inviterId: connection.receiverId, inviteeId: connection.senderId },
                ],
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to desync calendar:', error);
        return { error: 'Failed to desync calendar' };
    }
}

export async function syncCalendar(connectionId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const connection = await prisma.connection.findUnique({
            where: { id: connectionId },
            include: { receiver: true, sender: true },
        });

        if (!connection) return { error: 'Connection not found' };
        if (connection.status !== 'accepted') return { error: 'Connection not accepted' };

        const braiderId = connection.sender.role === 'braider' ? connection.senderId : connection.receiverId;
        const receiverId = connection.sender.role === 'barn' || connection.sender.role === 'subcontractor' ? connection.senderId : connection.receiverId;

        const shows = await prisma.show.findMany({
            where: {
                userId: braiderId,
                startDate: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
            select: { id: true },
        });

        if (shows.length > 0) {
            await prisma.showInvite.createMany({
                data: shows.map((show) => ({
                    showId: show.id,
                    inviterId: braiderId,
                    inviteeId: receiverId,
                    status: 'accepted',
                })),
                skipDuplicates: true,
            });
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to sync calendar' };
    }
}

export async function acceptRelationRequest(connectionId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const connection = await prisma.connection.update({
            where: { id: connectionId },
            data: { status: 'accepted' },
            include: { receiver: true, sender: true },
        });

        await syncCalendar(connectionId);

        await createNotification(
            connection.senderId,
            NotificationType.barn_status_change,
            `${connection.receiver.name} accepted your connection request`,
            null,
            connection.receiverId,
            connection.receiver.image
        );
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to accept request' };
    }
}

export async function getRelationByPublicID(publicID: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { publicID: publicID.toLowerCase() },
            select: {
                name: true,
                image: true,
                role: true,
                publicID: true,
            },
        });

        if (!user) return { error: 'User not found' };
        return { user };
    } catch (error) {
        return { error: 'Failed to fetch user' };
    }
}
