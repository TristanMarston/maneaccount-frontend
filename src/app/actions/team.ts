'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createNotification } from './notifications';
import { NotificationType } from '@prisma/client';
import { syncCalendar, desyncCalendar } from './barn-relations';

export async function getUserByPublicID(publicID: string) {
    if (!publicID) return;

    const session = await auth();
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

        const targetRole = user.role === 'braider' ? 'subcontractor' : 'braider';

        const sent = user.sentConnections
            .filter((c) => c.status === 'accepted' && c.receiver.role === targetRole)
            .map((c) => ({ ...c.receiver, connectionID: c.id, joinedAt: c.createdAt }));

        const received = user.receivedConnections
            .filter((c) => c.status === 'accepted' && c.sender.role === targetRole)
            .map((c) => ({ ...c.sender, connectionID: c.id, joinedAt: c.createdAt }));

        return [...sent, ...received];
    } catch (error) {
        console.error('Failed to fetch team:', error);
        return [];
    }
}

export async function getTeamRequests(email: string) {
    if (!email) return { incoming: [], outgoing: [] };

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                sentConnections: { include: { receiver: true } },
                receivedConnections: { include: { sender: true } },
            },
        });

        if (!user) return [];

        const targetRole = user.role === 'braider' ? 'subcontractor' : 'braider';

        const sent = user.sentConnections
            .filter((c) => c.status === 'pending' && c.receiver.role === targetRole)
            .map((c) => ({ ...c.receiver, connectionID: c.id, joinedAt: c.createdAt }));

        const received = user.receivedConnections
            .filter((c) => c.status === 'pending' && c.sender.role === targetRole)
            .map((c) => ({ ...c.sender, connectionID: c.id, joinedAt: c.createdAt }));

        return { incoming: received, outgoing: sent };
    } catch (error) {
        console.error('Failed to fetch team:', error);
        return [];
    }
}

// export async function getPendingRequests(email: string) {
//     if (!email) return { incoming: [], outgoing: [] };

//     try {
//         const user = await prisma.user.findUnique({
//             where: { email },
//             include: {
//                 receivedConnections: {
//                     where: { status: 'pending' },
//                     include: { sender: true },
//                 },
//                 sentConnections: {
//                     where: { status: 'pending' },
//                     include: { receiver: true },
//                 },
//             },
//         });

//         if (!user) return { incoming: [], outgoing: [] };

//         const incoming = user.receivedConnections.map((c) => ({
//             ...c.sender,
//             connectionID: c.id,
//             sentAt: c.createdAt,
//         }));

//         const outgoing = user.sentConnections.map((c) => ({
//             ...c.receiver,
//             connectionID: c.id,
//             sentAt: c.createdAt,
//         }));

//         return { incoming, outgoing };
//     } catch (error) {
//         console.error('Failed to fetch pending requests:', error);
//         return { incoming: [], outgoing: [] };
//     }
// }

export async function inviteUser(publicID: string) {
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

        const connection = await prisma.connection.create({
            data: {
                senderId: sender.id,
                receiverId: receiver.id,
                status: 'pending',
            },
        });

        await createNotification(
            receiver.id,
            NotificationType.team_invite,
            `${sender.name} ${sender.role === 'braider' ? 'invited you to their team' : 'wants to join your team'}`,
            connection.id,
            sender.id,
            sender.image
        );

        revalidatePath('/dashboard');
        return { success: true, message: `Invitation sent to ${receiver.name}` };
    } catch (error) {
        console.error('Invite error:', error);
        return { error: 'Failed to send invitation' };
    }
}

export async function acceptRequest(connectionID: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const connection = await prisma.connection.findUnique({
            where: { id: connectionID },
            include: { receiver: true },
        });

        if (!connection || connection.receiver.email !== session.user.email) {
            return { error: 'Unauthorized' };
        }

        const updatedConnection = await prisma.connection.update({
            where: { id: connectionID },
            data: { status: 'accepted' },
            include: { sender: true, receiver: true },
        });

        await syncCalendar(connectionID);

        await createNotification(
            updatedConnection.senderId,
            NotificationType.team_status_change,
            `${updatedConnection.receiver.name} accepted your team invitation`,
            connectionID,
            updatedConnection.receiverId
        );

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to accept request' };
    }
}

export async function removeMember(connectionID: string, rejected: boolean) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        if (rejected) {
            const connection = await prisma.connection.findUnique({ where: { id: connectionID }, include: { sender: true, receiver: true } });
            if (connection) {
                await createNotification(
                    connection.sender.id,
                    NotificationType.team_status_change,
                    `${connection.receiver.name} rejected your team invitation`,
                    connectionID,
                    connection.receiver.id
                );
            }
        }

        if (!rejected) await desyncCalendar(connectionID);

        await prisma.connection.delete({
            where: { id: connectionID },
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to remove team member:', error);
        return { error: 'Failed to remove member' };
    }
}
