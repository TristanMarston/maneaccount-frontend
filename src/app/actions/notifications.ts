'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getNotifications() {
    const session = await auth();
    if (!session?.user?.email) return [];

    try {
        return await prisma.notification.findMany({
            where: { user: { email: session.user.email } },
            include: { sender: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        return [];
    }
}

export async function getUnreadNotificationCount() {
    const session = await auth();
    if (!session?.user?.email) return { total: 0, byType: {} };

    try {
        const counts = await prisma.notification.groupBy({
            by: ['type'],
            where: {
                user: { email: session.user.email },
                isRead: false,
            },
            _count: {
                _all: true,
            },
        });

        const byType = counts.reduce((acc: any, curr) => {
            acc[curr.type] = curr._count._all;
            return acc;
        }, {});

        const total = counts.reduce((acc, curr) => acc + curr._count._all, 0);

        return { total, byType };
    } catch (error) {
        console.error('Get unread count error:', error);
        return { total: 0, byType: {} };
    }
}

export async function markAsRead(notificationId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Mark as read error:', error);
        return { error: 'Failed to mark as read' };
    }
}

export async function markAllAsRead() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.notification.updateMany({
            where: {
                user: { email: session.user.email },
                isRead: false,
            },
            data: { isRead: true },
        });
        
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Mark all as read error:', error);
        return { error: 'Failed to mark all as read' };
    }
}

export async function markAllTypeAsRead(type: NotificationType, targetId?: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.notification.updateMany({
            where: {
                user: { email: session.user.email },
                type,
                targetId,
                isRead: false,
            },
            data: { isRead: true },
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Mark all type as read error:', error);
        return { error: 'Failed to mark notifications as read' };
    }
}

export async function deleteNotification(notificationId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.notification.delete({
            where: { id: notificationId },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Delete notification error:', error);
        return { error: 'Failed to delete notification' };
    }
}

export async function createNotification(userId: string, type: NotificationType, message: string, targetId?: string | null, senderId?: string | null) {
    try {
        await prisma.notification.create({
            data: {
                userId,
                type,
                message,
                targetId,
                senderId,
            },
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Create notification error:', error);
        return { error: 'Failed to create notification' };
    }
}
