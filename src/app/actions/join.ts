'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function getUserByPublicID(publicID: string) {
    if (!publicID) return { error: 'Invalid ID' };

    const session = await auth();
    if (!session?.user?.role) return { error: 'Unauthorized' };
    const role = session.user.role;

    try {
        const users = await prisma.user.findMany({
            where: { publicID: publicID.toLowerCase(), role: { in: role === 'barn' || role === 'subcontractor' ? ['braider'] : ['barn', 'subcontractor'] } },
            select: {
                id: true,
                name: true,
                image: true,
                role: true,
                publicID: true,
                subscriptionTier: true,
            },
            take: 2,
        });

        if (users.length === 0) return { error: 'User not found' };
        if (users.length > 1) return { error: 'Multiple users found with that public ID' };

        return { user: users[0] };
    } catch (error) {
        console.error('Failed to fetch inviter:', error);
        return { error: 'Failed to fetch inviter details' };
    }
}

export async function getIDByPublicID(publicID: string, role: string) {
    if (!publicID) return { error: 'No publicID found', success: undefined };

    try {
        const users = await prisma.user.findMany({
            where: { publicID, role: { in: role === 'barn' || role === 'subcontractor' ? ['braider'] : ['barn', 'subcontractor'] } },
            select: {
                id: true,
            },
            take: 2,
        });

        if (users.length === 1) return { success: users[0], error: undefined };
        if (users.length > 1) return { error: 'Multiple users found with that publicID', success: undefined };
        else return { error: 'No user found with that publicID', success: undefined };
    } catch (err) {
        console.error('Error finding ID', err);
        return { error: 'Error finding ID', success: undefined };
    }
}

export async function getConnection(userID: string, targetUserID: string) {
    if (!userID || !targetUserID) return { error: 'No userID or targetUserID found', success: undefined };

    try {
        const existing = await prisma.connection.findFirst({
            where: {
                OR: [
                    { senderId: userID, receiverId: targetUserID },
                    { senderId: targetUserID, receiverId: userID },
                ],
            },
        });

        if (existing) return { success: existing, error: undefined };
        else return { error: 'No connection found', success: undefined };
    } catch (err) {
        console.error('Error creating join-request connection:', err);
        return { error: 'Error fetching join-request connection', success: undefined };
    }
}

export async function establishConnection(userId: string) {
    if (!userId) return { error: 'No user id found' };

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
                subscriptionTier: true,
            },
        });

        if (!dbUser) return { error: 'No user found with that id' };

        const cookieStore = await cookies();
        const joinCookie = cookieStore.get('join_request_user');
        const targetPublicID = joinCookie?.value;

        if (targetPublicID) {
            const targetUsers = await prisma.user.findMany({
                where: { publicID: targetPublicID, role: { in: dbUser.role === 'barn' || dbUser.role === 'subcontractor' ? ['braider'] : ['barn', 'subcontractor'] } },
                select: {
                    id: true,
                    role: true,
                    subscriptionTier: true,
                },
                take: 2,
            });
            const targetUser = targetUsers.length === 1 ? targetUsers[0] : null;

            if (!targetUser) return { error: targetUsers.length > 1 ? 'Multiple target users found' : 'No target user found' };

            if (
                (dbUser.role === 'braider' && targetUser.role === 'subcontractor' && dbUser.subscriptionTier === 'starter') ||
                (dbUser.role === 'subcontractor' && targetUser.role === 'braider' && targetUser.subscriptionTier === 'starter')
            )
                return { error: 'Braider must have professional or enterprise subscription to connect with subcontractors' };

            if (targetUser && dbUser && targetUser.id !== dbUser.id) {
                const existing = await getConnection(dbUser.id, targetUser.id);

                let validConnection = false;
                if (targetUser.role === 'braider' && (dbUser.role === 'barn' || dbUser.role === 'subcontractor')) validConnection = true;
                if (targetUser.role === 'subcontractor' && dbUser.role === 'braider') validConnection = true;
                if (targetUser.role === 'barn' && dbUser.role === 'braider') validConnection = true;

                if (existing.error && validConnection) {
                    await prisma.connection.create({
                        data: {
                            senderId: dbUser.id,
                            receiverId: targetUser.id,
                            status: 'pending',
                        },
                    });

                    cookieStore.delete('join_request_user');

                    return { success: true };
                } else if (existing.success) {
                    if (existing.success.status === 'pending' && existing.success.senderId !== dbUser.id) {
                        await prisma.connection.update({
                            where: { id: existing.success.id },
                            data: { status: 'accepted' },
                        });
                    } else if (existing.success.status === 'pending') return { error: 'Existing connection' };

                    cookieStore.delete('join_request_user');
                    return { success: true };
                } else {
                    cookieStore.delete('join_request_user');
                    return { error: 'invalid connection, or existing connection' };
                }
            }
        }
    } catch (err) {
        console.error('Error creating join-request connection:', err);
    }
}
