'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import { revalidatePath } from 'next/cache';

async function getGoogleAuth(email: string) {
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            accounts: {
                where: { provider: 'google' },
            },
        },
    });

    if (!user || !user.accounts[0]) {
        throw new Error('REQUIRE_CONNECT');
    }

    const account = user.accounts[0];

    if (!account.refresh_token) {
        throw new Error('REQUIRE_RECONNECT');
    }

    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
    });

    return { oauth2Client, user };
}

async function getOrCreateCalendar(oauth2Client: any, user: any) {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    let targetCalendarId = user.googleCalendarId;

    if (!targetCalendarId) {
        try {
            const newCalendar = await calendar.calendars.insert({
                requestBody: {
                    summary: 'ManeAccount',
                    description: 'Shows and events created by the ManeAccount app',
                    timeZone: 'UTC',
                },
            });
            targetCalendarId = newCalendar.data.id!;

            await prisma.user.update({
                where: { id: user.id },
                data: { googleCalendarId: targetCalendarId },
            });
        } catch (calError: any) {
            console.error('Error creating secondary calendar:', calError);
            throw new Error('Failed to create ManeAccount calendar. Please ensure you have granted calendar permissions.');
        }
    }
    return { calendar, targetCalendarId };
}

export async function addToGoogleCalendar(showId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const { oauth2Client, user } = await getGoogleAuth(session.user.email);
        const { calendar, targetCalendarId } = await getOrCreateCalendar(oauth2Client, user);

        const show = await prisma.show.findUnique({
            where: { id: showId },
            include: {
                invites: {
                    where: { invitee: { email: session.user.email } },
                },
                user: true,
            },
        });

        if (!show) return { error: 'Show not found' };

        const isOwner = show.user.email === session.user.email;
        const invite = show.invites[0];

        if (!isOwner && !invite) {
            return { error: 'Unauthorized Access to Show' };
        }

        const start = show.startDate;
        const end = show.endDate;

        const exclusiveEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);

        const event = {
            summary: show.name,
            location: `${show.city}, ${show.state ? show.state + ', ' : ''}${show.country}`,
            description: `Show in ${show.city}, ${show.state || show.country}`,
            start: {
                date: start.toISOString().split('T')[0], // YYYY-MM-DD
            },
            end: {
                date: exclusiveEnd.toISOString().split('T')[0],
            },
        };
        
        const existingEventId = isOwner ? show.googleEventId : invite?.googleEventId;

        let response;
        if (existingEventId) {
            response = await calendar.events.patch({
                calendarId: targetCalendarId,
                eventId: existingEventId,
                requestBody: event,
            });
        } else {
            response = await calendar.events.insert({
                calendarId: targetCalendarId,
                requestBody: event,
            });
        }

        if (response.status === 200 || response.status === 201) {
            const googleEventId = response.data.id;
            // Update DB
            if (isOwner) {
                await prisma.show.update({
                    where: { id: showId },
                    data: {
                        addedToGoogleCalendar: true,
                        googleEventId: googleEventId,
                    },
                });
            } else if (invite) {
                await prisma.showInvite.update({
                    where: { id: invite.id },
                    data: {
                        addedToGoogleCalendar: true,
                        googleEventId: googleEventId,
                    },
                });
            }

            revalidatePath('/dashboard');
            return { success: true, link: response.data.htmlLink };
        } else {
            return { error: 'Failed to add to Google Calendar' };
        }
    } catch (error: any) {
        console.error('Add to Google Calendar error:', error);
        if (error.message === 'REQUIRE_CONNECT' || error.message === 'REQUIRE_RECONNECT') {
            return { error: error.message };
        }
        return { error: error.message || 'Failed to add to Google Calendar' };
    }
}

async function updateSingleEvent(email: string, eventId: string, eventDetails: any) {
    try {
        const { oauth2Client, user } = await getGoogleAuth(email);
        const { calendar, targetCalendarId } = await getOrCreateCalendar(oauth2Client, user);

        await calendar.events.patch({
            calendarId: targetCalendarId,
            eventId: eventId,
            requestBody: eventDetails,
        });
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to update event for ${email}:`, error.message);
        return { error: error.message };
    }
}

export async function updateGoogleCalendarEvent(showId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const show = await prisma.show.findUnique({
            where: { id: showId },
            include: {
                user: true,
                invites: {
                    where: { addedToGoogleCalendar: true, googleEventId: { not: null } },
                    include: { invitee: true },
                },
            },
        });

        if (!show) return { error: 'Show not found' };

        // Prepare the event details
        const start = show.startDate;
        const end = show.endDate;
        const exclusiveEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);

        const eventDetails = {
            summary: show.name,
            location: `${show.city}, ${show.state ? show.state + ', ' : ''}${show.country}`,
            description: `Show in ${show.city}, ${show.state || show.country}`,
            start: {
                date: start.toISOString().split('T')[0],
            },
            end: {
                date: exclusiveEnd.toISOString().split('T')[0],
            },
        };

        const updatePromises = [];

        // 1. Update owner's event if synced
        if (show.addedToGoogleCalendar && show.googleEventId && show.user.email) {
            updatePromises.push(updateSingleEvent(show.user.email, show.googleEventId, eventDetails));
        }

        // 2. Update all invitees' events
        for (const invite of show.invites) {
            if (invite.googleEventId && invite.invitee.email) {
                updatePromises.push(updateSingleEvent(invite.invitee.email, invite.googleEventId, eventDetails));
            }
        }

        await Promise.all(updatePromises);

        return { success: true };
    } catch (error: any) {
        console.error('Update Google Calendar error:', error);
        return { error: error.message || 'Failed to update Google Calendar' };
    }
}

export async function deleteGoogleCalendarEvent(showId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const show = await prisma.show.findUnique({
            where: { id: showId },
            include: {
                user: true,
                invites: {
                    where: { invitee: { email: session.user.email } },
                },
            },
        });

        if (!show) return { error: 'Show not found' };

        const isOwner = show.user.email === session.user.email;
        const invite = show.invites[0];

        // @ts-ignore - googleEventId is added to schema but prisma types are stale
        const eventId = isOwner ? show.googleEventId : invite?.googleEventId;

        if (!eventId) return { success: true }; // Nothing to delete

        const { oauth2Client, user } = await getGoogleAuth(session.user.email);
        const { calendar, targetCalendarId } = await getOrCreateCalendar(oauth2Client, user);

        await calendar.events.delete({
            calendarId: targetCalendarId,
            eventId: eventId,
        });

        return { success: true };
    } catch (error: any) {
        console.error('Delete Google Calendar error:', error);
        return { error: error.message || 'Failed to delete Google Calendar' };
    }
}
