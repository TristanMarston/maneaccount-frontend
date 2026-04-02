'use server';

import { auth } from '@/lib/auth';
import { sendConnectionRequestEmail } from '@/lib/email';
import { getBraiderUsage } from '@/lib/limits';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';
import { format } from 'date-fns-tz';
import { revalidatePath } from 'next/cache';
import { calendarDateToLocal } from '@/lib/date-utils';

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
            by: ['type', 'targetId'],
            where: {
                user: { email: session.user.email },
                isRead: false,
            },
            _count: {
                _all: true,
            },
        });

        const byType = await counts.reduce(async (acc: any, curr) => {
            if (curr.type === NotificationType.new_message) {
                const note = await prisma.note.findUnique({
                    where: { id: curr.targetId || '' },
                    select: { jobId: true },
                });
                if (!note) return acc;
                acc[`${curr.type}_${note.jobId}`] = curr._count._all;
                return acc;
            } else {
                acc[curr.type] = curr._count._all;
                return acc;
            }
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

export async function markAllMessagesAsRead(targetId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const job = await prisma.job.findUnique({ where: { id: targetId }, include: { notes: true } });
        if (!job) return { error: 'Job not found' };

        const noteIds = job.notes.map((note) => note.id);

        await prisma.notification.updateMany({
            where: {
                user: { email: session.user.email },
                type: NotificationType.new_message,
                targetId: { in: noteIds },
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

export async function createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    targetId?: string | null,
    senderId?: string | null,
    image?: string | null,
    sendToHorseOwners?: boolean | null,
) {
    try {
        await prisma.notification.create({
            data: {
                userId,
                type,
                message,
                targetId,
                senderId,
                image,
            },
        });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.email) return { error: 'No email provided' };

        if (user.emailVerified || type === NotificationType.job_completed) {
            if (
                (type === NotificationType.team_invite && user.allowedNotifications.includes('team_invite')) ||
                (type === NotificationType.barn_invite && user.allowedNotifications.includes('barn_invite'))
            ) {
                await sendConnectionRequestEmail({
                    to: user.email,
                    message,
                    image,
                });
            } else if (
                (type === NotificationType.barn_status_change && user.allowedNotifications.includes('barn_status_change')) ||
                (type === NotificationType.team_status_change && user.allowedNotifications.includes('team_status_change'))
            ) {
                const { sendStatusChangeEmail } = await import('@/lib/email');
                await sendStatusChangeEmail({
                    to: user.email,
                    message,
                    connection: true,
                    image,
                    link: 'https://maneaccount.com/dashboard',
                });
            } else if (type === NotificationType.calendar_invite && user.allowedNotifications.includes('calendar_invite')) {
                if (targetId) {
                    const show = await prisma.show.findUnique({ where: { id: targetId } });
                    if (show) {
                        const { sendCalendarInviteEmail } = await import('@/lib/email');
                        let inviterName = 'A user';
                        if (senderId) {
                            const sender = await prisma.user.findUnique({ where: { id: senderId } });
                            if (sender?.name) inviterName = sender.name;
                        }

                        await sendCalendarInviteEmail({
                            to: user.email,
                            eventName: show.name,
                            startDate: calendarDateToLocal(show.startDate),
                            endDate: calendarDateToLocal(show.endDate),
                            location: `${show.city}, ${show.state || show.country}`,
                            inviterName,
                            message,
                        });
                    }
                }
            } else if (type === NotificationType.job_request && user.allowedNotifications.includes('job_request')) {
                if (targetId) {
                    const job = await prisma.job.findUnique({
                        where: { id: targetId },
                        include: {
                            show: true,
                            barn: true,
                            braider: true,
                            assignments: {
                                include: {
                                    horse: true,
                                    services: true,
                                },
                            },
                        },
                    });

                    if (job) {
                        const { sendJobRequestEmail } = await import('@/lib/email');
                        const isSubcontractor = user.role === 'subcontractor';

                        let assignedHorses: string[] = [];
                        let earnings = job.assignments.reduce((acc, a) => acc + a.services.reduce((acc, s) => acc + s.priceUSD, 0), 0);
                        let serviceCount = job.assignments.reduce((acc, a) => acc + a.services.length, 0);
                        if (isSubcontractor) {
                            assignedHorses = job.assignments.filter((a) => a.subcontractorId === userId).map((a) => a.horse.showName);
                            earnings = job.assignments.filter((a) => a.subcontractorId === userId).reduce((acc, a) => acc + a.services.reduce((acc, s) => acc + s.priceUSD, 0), 0);
                            serviceCount = job.assignments.filter((a) => a.subcontractorId === userId).reduce((acc, a) => acc + a.services.length, 0);
                        }

                        await sendJobRequestEmail({
                            to: user.email,
                            showName: job.show.name,
                            barnName: job.barn.name || 'Barn',
                            braiderName: job.braider.name || 'Braider',
                            horseCount: isSubcontractor ? assignedHorses.length : job.assignments.length,
                            serviceCount,
                            isSubcontractor,
                            assignedHorses,
                            earnings,
                        });
                    }
                }
            } else if (type === NotificationType.job_status_change && user.allowedNotifications.includes('job_status_change')) {
                if (targetId) {
                    const job = await prisma.job.findUnique({ where: { id: targetId } });

                    if (job) {
                        const { sendStatusChangeEmail } = await import('@/lib/email');

                        await sendStatusChangeEmail({
                            to: user.email,
                            message,
                            connection: false,
                            image,
                            link: 'https://maneaccount.com/dashboard',
                        });
                    }
                }
            } else if (type === NotificationType.job_completed) {
                if (targetId) {
                    const job = await prisma.job.findUnique({
                        where: { id: targetId },
                        include: {
                            show: true,
                            braider: true,
                            assignments: {
                                include: {
                                    horse: {
                                        include: {
                                            client: true,
                                        },
                                    },
                                    services: true,
                                    customCharges: true,
                                },
                            },
                        },
                    });

                    if (job) {
                        const { sendJobCompletedEmail } = await import('@/lib/email');

                        const mainServiceDetails: Record<
                            string,
                            {
                                horseName: { showName: string; barnName: string };
                                services: { price: number; name: string; subCharge: boolean }[];
                                earnings: number;
                                client: any;
                            }[]
                        > = {};

                        const validAssignments = job.assignments
                            .filter((a) => !a.canceledAt && (a.status === 'completed' || a.status === 'accepted') && a.services.length !== a.canceledServiceIds.length)
                            .sort((a, b) => a.assignmentDate.getTime() - b.assignmentDate.getTime());

                        for (const horse of validAssignments) {
                            const dateKey = format(calendarDateToLocal(horse.assignmentDate), 'yyyy-MM-dd');
                            if (!mainServiceDetails[dateKey]) {
                                mainServiceDetails[dateKey] = [];
                            }

                            mainServiceDetails[dateKey].push({
                                horseName: { showName: horse.horse.showName, barnName: horse.horse.barnName },
                                services: [
                                    ...horse.services
                                        .filter((s: any) => !horse.canceledServiceIds.includes(s.id))
                                        .map((s: any) => ({
                                            price: s.priceUSD,
                                            name: s.name,
                                            subCharge: false,
                                        })),
                                    ...horse.customCharges.map((c: any) => ({
                                        price: c.amount,
                                        name: c.name,
                                        subCharge: true,
                                    })),
                                ],
                                earnings:
                                    horse.services.reduce((acc: number, s: any) => (!horse.canceledServiceIds.includes(s.id) ? acc + s.priceUSD : acc), 0) +
                                    horse.customCharges.reduce((acc: number, c: any) => acc + c.amount, 0),
                                client: horse.horse.client,
                            });
                        }

                        const paymentInformation: { venmo?: string; zelle?: string } = {};
                        if (job.braider.venmo && job.braider.venmoEnabled) paymentInformation.venmo = job.braider.venmo;
                        if (job.braider.zelle && job.braider.zelle !== 'disabled')
                            paymentInformation.zelle = job.braider.zelle === 'email' ? job.braider.email || '' : job.braider.phoneNumber || '';

                        // HORSE DETAILS

                        const horseDetails: Record<string, Record<string, { days: Date[]; price: number }>> = {};
                        const horseExpenses: Record<string, number> = {};
                        for (const horse of validAssignments) {
                            const showName = horse.horse.showName;
                            const barnName = horse.horse.barnName;
                            const nameKey = `${showName}/////(${barnName})`;

                            if (!horseExpenses[nameKey]) horseExpenses[nameKey] = 0;
                            if (horse.customCharges.length > 0) horseExpenses[nameKey] += horse.customCharges.reduce((acc, c) => acc + c.amount, 0);

                            if (!horseDetails[nameKey]) horseDetails[nameKey] = {};

                            for (const service of horse.services) {
                                const serviceName = service.name;
                                if (!horseDetails[nameKey][serviceName]) horseDetails[nameKey][serviceName] = { days: [], price: 0 };

                                horseDetails[nameKey][serviceName].days.push(horse.assignmentDate);
                                horseDetails[nameKey][serviceName].days.sort((a, b) => a.getTime() - b.getTime());
                                horseDetails[nameKey][serviceName].price += service.priceUSD;
                            }
                        }

                        await sendJobCompletedEmail({
                            to: user.email,
                            braiderName: job.braider.name || 'Braider',
                            showName: job.show.name,
                            horseName: 'your horses',
                            thanksMessage: job.thanksMessage || '',
                            isClient: false,
                            image: image || '',
                            paymentInformation,
                            serviceDetails: [mainServiceDetails],
                            horseDetails,
                            horseExpenses,
                        });

                        if (sendToHorseOwners !== false) {
                            const notifiedClientIds = new Set<string>();
                            for (const assignment of job.assignments) {
                                if (
                                    assignment.canceledAt ||
                                    !(assignment.status === 'completed' || assignment.status === 'accepted') ||
                                    assignment.canceledServiceIds.length === assignment.services.length
                                )
                                    continue;

                                const client = assignment.horse.client;
                                if (client && client.email && !notifiedClientIds.has(client.id)) {
                                    const clientServiceDetails: Record<string, any[]> = {};

                                    for (const [date, horsesInDay] of Object.entries(mainServiceDetails)) {
                                        const clientHorses = horsesInDay.filter((h) => h.client?.id === client.id);
                                        if (clientHorses.length > 0) {
                                            clientServiceDetails[date] = clientHorses;
                                        }
                                    }

                                    const clientHorseDetails: Record<string, Record<string, { days: Date[]; price: number }>> = {};
                                    const clientHorseExpenses: Record<string, number> = {};
                                    for (const horse of validAssignments.filter((a) => a.horse.clientId === client.id)) {
                                        const showName = horse.horse.showName;
                                        const barnName = horse.horse.barnName;
                                        const nameKey = `${showName}/////(${barnName})`;

                                        if (!clientHorseExpenses[nameKey]) clientHorseExpenses[nameKey] = 0;
                                        if (horse.customCharges.length > 0) clientHorseExpenses[nameKey] += horse.customCharges.reduce((acc, c) => acc + c.amount, 0);

                                        if (!clientHorseDetails[nameKey]) clientHorseDetails[nameKey] = {};

                                        for (const service of horse.services) {
                                            const serviceName = service.name;
                                            if (!clientHorseDetails[nameKey][serviceName]) clientHorseDetails[nameKey][serviceName] = { days: [], price: 0 };

                                            clientHorseDetails[nameKey][serviceName].days.push(horse.assignmentDate);
                                            clientHorseDetails[nameKey][serviceName].days.sort((a, b) => a.getTime() - b.getTime());
                                            clientHorseDetails[nameKey][serviceName].price += service.priceUSD;
                                        }
                                    }

                                    if (Object.keys(clientServiceDetails).length > 0) {
                                        await sendJobCompletedEmail({
                                            to: client.email,
                                            braiderName: job.braider.name || 'Braider',
                                            showName: job.show.name,
                                            horseName: assignment.horse.showName,
                                            thanksMessage: job.thanksMessage || '',
                                            isClient: true,
                                            image: image || '',
                                            paymentInformation,
                                            serviceDetails: [clientServiceDetails],
                                            horseDetails: clientHorseDetails,
                                            horseExpenses: clientHorseExpenses,
                                        });
                                    }
                                    notifiedClientIds.add(client.id);
                                }
                            }
                        }
                    }
                }
            } else if (type === NotificationType.new_message && user.allowedNotifications.includes('new_message')) {
                const { sendNewMessageEmail } = await import('@/lib/email');
                let senderName = 'A user';
                let senderImage = null;
                if (senderId) {
                    const sender = await prisma.user.findUnique({ where: { id: senderId } });
                    if (sender?.name) senderName = sender.name;
                    senderImage = sender?.image;
                }

                let message = '';

                const note = targetId ? await prisma.note.findUnique({ where: { id: targetId }, include: { job: { include: { show: true } } } }) : null;
                if (note) message = note?.content || '';

                await sendNewMessageEmail({
                    to: user.email,
                    senderName,
                    message,
                    senderImage,
                    showName: note?.job?.show.name || '',
                });
            } else if (type === NotificationType.limit_approaching && user.allowedNotifications.includes('limit_approaching')) {
                const { sendLimitEmail } = await import('@/lib/email');

                const { count, limit, period } = await getBraiderUsage(user.id, user.subscriptionTier, new Date());

                await sendLimitEmail({
                    to: user.email,
                    count: count + 1,
                    limit: limit,
                    period: period,
                    type: 'approaching',
                });
            } else if (type === NotificationType.limit_exceeded && user.allowedNotifications.includes('limit_exceeded')) {
                const { sendLimitEmail } = await import('@/lib/email');

                const { count, limit, period } = await getBraiderUsage(user.id, user.subscriptionTier, new Date());

                const barn = await prisma.user.findUnique({ where: { id: senderId || '' } });

                await sendLimitEmail({
                    to: user.email,
                    count: count,
                    limit: limit,
                    period: period,
                    type: 'exceeded',
                    barnName: barn?.name,
                });
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Create notification error:', error);
        return { error: 'Failed to create notification' };
    }
}
