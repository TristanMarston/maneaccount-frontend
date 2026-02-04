'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { createNotification } from './notifications';
import { NotificationType } from '@prisma/client';
import { normalizeDateToUTC, getLocalTodayStart } from '@/lib/date-utils';

type CreateShowInput = {
    name: string;
    country: string;
    state?: string;
    city: string;
    startDate: Date;
    endDate: Date;

    invites?: string[];
};

// export async function syncToGoogleCalendar(userId: string, show: any, days: any[]) {
//     try {
//         // 1. Get the user's Google Account tokens
//         const account = await prisma.account.findFirst({
//             where: {
//                 userId: userId,
//                 provider: 'google',
//             },
//         });
//
//         if (!account || !account.access_token) {
//             console.log('No linked Google account found for calendar sync.');
//             return;
//         }
//
//         // 2. Setup Google OAuth Client
//         const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
//
//         auth.setCredentials({
//             access_token: account.access_token,
//             refresh_token: account.refresh_token,
//             // If expiry is stored as Int (seconds) or BigInt, convert if necessary.
//             // Prisma 'expires_at' is usually Int (seconds since epoch or seconds duration).
//             // Google expects expiry_date in ms.
//             expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
//         });
//
//         const calendar = google.calendar({ version: 'v3', auth });
//
//         // 3. Iterate through days and create events
//         for (const day of days) {
//             // Construct DateTimes for Google (ISO format)
//             // day.date is the base date, startTime is "HH:mm"
//
//             // Helper to combine date + time string into ISO string
//             const startDateTime = combineDateAndTime(day.date, day.startTime);
//             const endDateTime = combineDateAndTime(day.date, day.endTime);
//
//             const event = {
//                 summary: `Braiding: ${show.name}`,
//                 location: `${show.city}, ${show.state || ''}, ${show.country}`,
//                 description: 'Show schedule managed by ManeAccount',
//                 start: {
//                     dateTime: startDateTime,
//                     timeZone: 'UTC', // Ideally, you'd capture the show's specific timezone
//                 },
//                 end: {
//                     dateTime: endDateTime,
//                     timeZone: 'UTC',
//                 },
//             };
//
//             // 4. Insert Event
//             const response = await calendar.events.insert({
//                 calendarId: 'primary', // Use the user's main calendar
//                 requestBody: event,
//             });
//
//             // 5. Save Google Event ID locally (so we can update/delete later)
//             if (response.data.id) {
//                 await prisma.showDay.update({
//                     where: { id: day.id },
//                     data: { googleEventId: response.data.id },
//                 });
//             }
//         }
//     } catch (error) {
//         console.error('Google Calendar Sync Failed:', error);
//     }
// }

function combineDateAndTime(dateObj: Date, timeStr: string) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = new Date(dateObj);
    newDate.setUTCHours(hours, minutes, 0, 0);
    return newDate.toISOString();
}

async function syncToOutlookCalendar(show: any) {
    // TODO: Implement Microsoft Graph API
    console.log('Syncing to Outlook:', show.name);
}

async function syncToAppleCalendar(show: any) {
    // TODO: Generate .ics file or use CalDAV
    console.log('Syncing to Apple:', show.name);
}

export async function createShow(data: CreateShowInput) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

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

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return { error: 'User not found' };

        const connectedUserIds = connections.map((c) => (c.sender.email === session.user.email ? c.receiverId : c.senderId));

        const newShow = await prisma.show.create({
            data: {
                user: { connect: { id: user.id } },
                name: data.name,
                country: data.country,
                state: data.state,
                city: data.city,
                startDate: normalizeDateToUTC(data.startDate) || data.startDate,
                endDate: normalizeDateToUTC(data.endDate) || data.endDate,
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

        // Notify invitees
        if (connectedUserIds.length > 0) {
            for (const inviteeId of connectedUserIds) {
                await createNotification(inviteeId, NotificationType.calendar_invite, `${session.user.name} invited you to ${newShow.name}`, newShow.id, user.id);
            }
        }

        // await syncToGoogleCalendar(session.user.id, newShow, newShow.days);

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
                    gte: getLocalTodayStart(timezoneOffset),
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
                        invitee: { connect: { email: session.user.email! } },
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
            timezoneOffset,
        );
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to accept request' };
    }
}

export async function getInvites(email: string) {
    if (!email) return [];
    const session = await auth();
    if (!session?.user?.email) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { email },
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

export async function getShows(email: string) {
    if (!email) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { email },
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
                    startDate: normalizeDateToUTC(data.startDate)!,
                    endDate: normalizeDateToUTC(data.endDate)!,
                },
                include: { invites: true },
            });
        });

        // Notify new invitees
        for (const inviteeId of toAdd) {
            await createNotification(inviteeId, NotificationType.calendar_invite, `${existingShow.user.name} invited you to ${data.name}`, id, existingShow.userId);
        }

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
        } else {
            await prisma.showInvite.update({
                where: { id: invite.id },
                data: { status },
            });
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Respond invite error:', error);
        return { error: 'Failed to respond to invite' };
    }
}
