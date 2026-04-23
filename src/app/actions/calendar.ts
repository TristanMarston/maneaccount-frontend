'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createNotification } from './notifications';
import { deleteGoogleCalendarEvent, updateGoogleCalendarEvent } from './google-calendar';
import { NotificationType } from '@prisma/client';
import { toCalendarDateUTC, getUTCStartOfUserDay } from '@/lib/date-utils';

type CreateShowInput = {
    name: string;
    country: string;
    state?: string;
    city: string;
    startDate: Date;
    endDate: Date;
    invites?: string[];
};

export async function createShow(data: CreateShowInput) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const connections = await prisma.connection.findMany({
            where: {
                OR: [{ sender: { email: session.user.email } }, { receiver: { email: session.user.email } }],
                status: 'accepted',
            },
            include: {
                sender: true,
                receiver: true,
            },
        });

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) return { error: 'User not found' };

        const connectedUserIds = connections.map((c) => (c.sender.email === session.user.email ? c.receiverId : c.senderId));

        const newShow = await prisma.show.create({
            data: {
                user: { connect: { id: user.id } },
                name: data.name,
                country: data.country,
                state: data.state,
                city: data.city,
                startDate: toCalendarDateUTC(data.startDate),
                endDate: toCalendarDateUTC(data.endDate),
                invites: {
                    create: connectedUserIds.map((inviteeId) => ({
                        inviterId: user.id,
                        inviteeId: inviteeId,
                        status: 'pending',
                    })),
                },
            },
            include: { invites: { include: { invitee: true, inviter: true } } },
        });

        if (connectedUserIds.length > 0) {
            for (const inviteeId of connectedUserIds) {
                await createNotification(inviteeId, NotificationType.calendar_invite, `${session.user.name} invited you to ${newShow.name}`, newShow.id, user.id);
            }
        }

        revalidatePath('/dashboard');
        return { success: true, show: newShow };
    } catch (error) {
        console.error('Create show error:', error);
        return { error: 'Failed to create show' };
    }
}

export async function syncCalendar(connectionId: string, timezoneOffset: number = 0) {
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
                    gte: getUTCStartOfUserDay(),
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

export async function addShowToCalendar(showId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const show = await prisma.show.findUnique({
            where: { id: showId },
            include: { invites: true },
        });

        if (!show) return { error: 'Show not found' };

        await prisma.show.update({
            where: { id: showId },
            data: {
                invites: {
                    create: {
                        inviter: { connect: { id: show.userId } },
                        invitee: { connect: { id: session.user.id! } },
                        status: 'accepted',
                    },
                },
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Add show to calendar error:', error);
        return { error: 'Failed to add show to calendar' };
    }
}

export async function acceptRelationRequest(connectionId: string, timezoneOffset: number = 0) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const connection = await prisma.connection.update({
            where: { id: connectionId },
            data: { status: 'accepted' },
            include: { receiver: true, sender: true },
        });

        await syncCalendar(connectionId, timezoneOffset);

        await createNotification(
            connection.senderId,
            NotificationType.barn_status_change,
            `${connection.receiver.name} accepted your connection request`,
            null,
            connection.receiverId,
            connection.receiver.image,
        );
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to accept request' };
    }
}

export async function getInvites(userId: string) {
    if (!userId) return [];
    const session = await auth();
    if (!session?.user?.email) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                receivedShowInvites: {
                    where: { status: { in: ['accepted', 'pending'] } },
                    include: {
                        show: {
                            include: {
                                invites: { include: { invitee: true, inviter: true } },
                                user: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) return [];
        return user.receivedShowInvites;
    } catch (error) {
        console.error('Get invites error:', error);
        return [];
    }
}

export async function getShows(userId: string) {
    if (!userId) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                shows: {
                    include: {
                        invites: { include: { invitee: true, inviter: true } },
                    },
                    orderBy: { startDate: 'asc' },
                },
                receivedShowInvites: {
                    where: { status: { in: ['accepted', 'pending'] } },
                    include: {
                        show: {
                            include: {
                                invites: { include: { invitee: true, inviter: true } },
                                user: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) return [];

        const ownedShows = user.shows.map((s) => ({ ...s, isOwner: true }));
        const invitedShows = user.receivedShowInvites.map((invite) => ({
            ...invite.show,
            isOwner: false,
            inviteStatus: invite.status,
            inviteId: invite.id,
            inviterName: invite.show.user.name,
            addedToAppleCalendar: invite.addedToAppleCalendar,
            addedToGoogleCalendar: invite.addedToGoogleCalendar,
            addedToOutlook: invite.addedToOutlook,
            googleEventId: invite.googleEventId,
        }));

        const allShows = [...ownedShows, ...invitedShows].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        return allShows;
    } catch (error) {
        console.error('Get shows error:', error);
        return [];
    }
}

export async function updateShow(id: string, data: CreateShowInput) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        // Verify ownership
        const existingShow = await prisma.show.findUnique({
            where: { id },
            include: { user: true, invites: true },
        });

        if (!existingShow || existingShow.user.email !== session.user.email) {
            return { error: 'Unauthorized or show not found' };
        }

        // 2. Fetch all current connected users
        const connections = await prisma.connection.findMany({
            where: {
                OR: [{ sender: { email: session.user.email } }, { receiver: { email: session.user.email } }],
                status: 'accepted',
            },
        });

        const connectedUserIds = connections.map((c) => (c.senderId === existingShow.userId ? c.receiverId : c.senderId));
        const currentInviteeIds = existingShow.invites.map((i) => i.inviteeId);

        const toAdd = connectedUserIds.filter((id) => !currentInviteeIds.includes(id));

        const updatedShow = await prisma.$transaction(async (tx) => {
            // Create new invites for missing connections
            for (const inviteeId of toAdd) {
                await tx.showInvite.create({
                    data: {
                        showId: id,
                        inviterId: existingShow.userId,
                        inviteeId,
                        status: 'pending',
                    },
                });
            }

            return await tx.show.update({
                where: { id },
                data: {
                    name: data.name,
                    country: data.country,
                    state: data.state,
                    city: data.city,
                    startDate: toCalendarDateUTC(data.startDate)!,
                    endDate: toCalendarDateUTC(data.endDate)!,
                },
                include: { invites: true },
            });
        });

        for (const inviteeId of toAdd) {
            await createNotification(inviteeId, NotificationType.calendar_invite, `${existingShow.user.name} invited you to ${data.name}`, id, existingShow.userId);
        }

        await updateGoogleCalendarEvent(id);

        revalidatePath('/dashboard');
        return { success: true, show: updatedShow };
    } catch (error) {
        console.error('Update show error:', error);
        return { error: 'Failed to update show' };
    }
}

export async function deleteShow(id: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const show = await prisma.show.findUnique({ where: { id }, include: { user: true } });
        if (show && show.user.email === session.user.email) {
            await deleteGoogleCalendarEvent(id);
            await prisma.show.delete({
                where: { id },
            });
            revalidatePath('/dashboard');
            return { success: true };
        }

        // If invitee, decline/delete invite
        const invite = await prisma.showInvite.findFirst({
            where: {
                showId: id,
                invitee: { email: session.user.email },
            },
        });

        if (invite) {
            await deleteGoogleCalendarEvent(id);
            await prisma.showInvite.delete({ where: { id: invite.id } });
            revalidatePath('/dashboard');
            return { success: true };
        }

        return { error: 'Unauthorized' };
    } catch (error) {
        console.error('Delete show error:', error);
        return { error: 'Failed to delete show' };
    }
}

export async function respondToShowInvite(showId: string, status: 'accepted' | 'declined') {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const invite = await prisma.showInvite.findFirst({
            where: {
                showId,
                invitee: { email: session.user.email },
            },
        });

        if (!invite) return { error: 'Invite not found' };

        if (status === 'declined') {
            await prisma.showInvite.delete({ where: { id: invite.id } });
            revalidatePath('/dashboard');
            return { success: true };
        } else {
            await prisma.showInvite.update({
                where: { id: invite.id },
                data: { status },
            });

            const show = await prisma.show.findUnique({
                where: { id: showId },
                select: { name: true },
            });

            revalidatePath('/dashboard');
            return { success: true, showName: show?.name || 'Show', googleSynced: false, appleSynced: false, outlookSynced: false };
        }
    } catch (error) {
        console.error('Respond invite error:', error);
        return { error: 'Failed to respond to invite' };
    }
}
