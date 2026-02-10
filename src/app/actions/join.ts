'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function getUserByPublicID(publicID: string) {
    if (!publicID) return { error: 'Invalid ID' };

    try {
        const user = await prisma.user.findUnique({
            where: { publicID: publicID.toLowerCase() },
            select: {
                id: true,
                name: true,
                image: true,
                role: true,
                publicID: true,
            },
        });

        if (!user) return { error: 'User not found' };

        return { user };
    } catch (error) {
        console.error('Failed to fetch inviter:', error);
        return { error: 'Failed to fetch inviter details' };
    }
}

export async function getIDByEmail(email: string) {
    if (!email) return { error: 'No email found', success: undefined };

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
            },
        });

        if (user) return { success: user, error: undefined };
        else return { error: 'No user found with that email', success: undefined };
    } catch (err) {
        console.error('Error finding ID', err);
        return { error: 'Error finding ID', success: undefined };
    }
}

export async function getIDByPublicID(publicID: string) {
    if (!publicID) return { error: 'No publicID found', success: undefined };

    try {
        const user = await prisma.user.findUnique({
            where: { publicID },
            select: {
                id: true,
            },
        });

        if (user) return { success: user, error: undefined };
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

export async function establishConnection(email: string) {
    if (!email) return { error: 'No email found' };

    try {
        const dbUser = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                role: true,
                subscriptionTier: true,
            },
        });

        if (!dbUser) return { error: 'No user found with that email address' };

        const cookieStore = await cookies();
        const joinCookie = cookieStore.get('join_request_user');
        const targetPublicID = joinCookie?.value;

        if (targetPublicID) {
            const targetUser = await prisma.user.findUnique({
                where: { publicID: targetPublicID },
                select: {
                    id: true,
                    role: true,
                    subscriptionTier: true,
                },
            });

            if (!targetUser) return { error: 'No target user found' };

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
                    }

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
