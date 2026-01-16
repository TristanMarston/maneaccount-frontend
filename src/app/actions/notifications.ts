'use server';

import { auth } from '@/lib/auth';
import { sendConnectionRequestEmail } from '@/lib/email';
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

export async function createNotification(userId: string, type: NotificationType, message: string, targetId?: string | null, senderId?: string | null, image?: string | null) {
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

        if (type === NotificationType.team_invite || type === NotificationType.barn_invite) {
            await sendConnectionRequestEmail({
                to: user.email,
                message,
                image,
            });
        } else if (type === NotificationType.barn_status_change || type === NotificationType.team_status_change) {
            const { sendStatusChangeEmail } = await import('@/lib/email');
            await sendStatusChangeEmail({
                to: user.email,
                message,
                connection: true,
                image,
                link: 'https://maneaccount.com/dashboard',
            });
        } else if (type === NotificationType.calendar_invite) {
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
                        date: `${show.startDate.toLocaleDateString()} - ${show.endDate.toLocaleDateString()}`,
                        location: `${show.city}, ${show.state || show.country}`,
                        inviterName,
                        message,
                    });
                }
            }
        } else if (type === NotificationType.job_request) {
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
                        date: job.scheduledDate ? job.scheduledDate.toLocaleDateString() : 'TBD',
                        horseCount: isSubcontractor ? assignedHorses.length : job.assignments.length,
                        serviceCount,
                        isSubcontractor,
                        assignedHorses,
                        earnings,
                    });
                }
            }
        } else if (type === NotificationType.job_status_change) {
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
                        date: job.scheduledDate ? job.scheduledDate.toLocaleDateString() : 'TBD',
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
                            },
                        },
                    },
                });

                if (job) {
                    const { sendJobCompletedEmail } = await import('@/lib/email');

                    const serviceDetails: { horseName: { showName: string; barnName: string }; serviceCount: number; earnings: number; client: any }[] = [];
                    const horses = job.assignments.filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length);

                    for (const horse of horses) {
                        serviceDetails.push({
                            horseName: { showName: horse.horse.showName, barnName: horse.horse.barnName },
                            serviceCount: horse.services.filter((s) => !horse.canceledServiceIds.includes(s.id)).length,
                            earnings: horse.services.reduce((acc, s) => (!horse.canceledServiceIds.includes(s.id) ? acc + s.priceUSD : acc), 0),
                            client: horse.horse.client,
                        });
                    }

                    const paymentInformation: { venmo?: string; zelle?: string } = {};
                    if (job.braider.venmo && job.braider.venmoEnabled) paymentInformation.venmo = job.braider.venmo;
                    if (job.braider.zelle && job.braider.zelle !== 'disabled')
                        paymentInformation.zelle = job.braider.zelle === 'email' ? job.braider.email || '' : job.braider.phoneNumber || '';

                    await sendJobCompletedEmail({
                        to: user.email,
                        braiderName: job.braider.name || 'Braider',
                        showName: job.show.name,
                        horseName: 'your horses',
                        isClient: false,
                        image: image || '',
                        paymentInformation,
                        serviceDetails: serviceDetails.map((d) => ({
                            horseName: d.horseName,
                            serviceCount: d.serviceCount,
                            earnings: d.earnings,
                        })),
                    });

                    const notifiedClientIds = new Set<string>();
                    for (const assignment of job.assignments) {
                        if (assignment.canceledAt || assignment.canceledServiceIds.length === assignment.services.length) continue;

                        const client = assignment.horse.client;
                        if (client && client.email && !notifiedClientIds.has(client.id)) {
                            const clientServiceDetails = serviceDetails.filter((d) => d.client.id === client.id);

                            await sendJobCompletedEmail({
                                to: client.email,
                                braiderName: job.braider.name || 'Braider',
                                showName: job.show.name,
                                horseName: assignment.horse.showName,
                                isClient: true,
                                paymentInformation,
                                serviceDetails: clientServiceDetails.map((d) => ({
                                    horseName: d.horseName,
                                    serviceCount: d.serviceCount,
                                    earnings: d.earnings,
                                })),
                            });
                            notifiedClientIds.add(client.id);
                        }
                    }
                }
            }
        } else if (type === NotificationType.job_paid) {
            if (targetId) {
                const job = await prisma.job.findUnique({
                    where: { id: targetId },
                    include: {
                        show: true,
                        barn: true,
                        assignments: {
                            include: {
                                services: true,
                            },
                        },
                    },
                });

                if (job) {
                    const { sendJobPaidEmail } = await import('@/lib/email');
                    const paymentMethod = job.paymentPlatform || 'Unknown';
                    const amount = job.assignments.reduce(
                        (acc, a) => acc + (a.canceledAt ? 0 : a.services.reduce((sAcc, s) => sAcc + (a.canceledServiceIds.includes(s.id) ? 0 : s.priceUSD), 0)),
                        0,
                    );

                    await sendJobPaidEmail({
                        to: user.email,
                        barnName: job.barn.name || 'Barn',
                        amount,
                        showName: job.show.name,
                        paymentMethod,
                        image: image || '',
                    });
                }
            }
        } else if (type === NotificationType.new_message) {
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
        }
        return { success: true };
    } catch (error) {
        console.error('Create notification error:', error);
        return { error: 'Failed to create notification' };
    }
}
