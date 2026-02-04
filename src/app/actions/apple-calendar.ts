'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createEvents, EventAttributes } from 'ics';
import { revalidatePath } from 'next/cache';

export async function generateShowICS(showId: string) {
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

        if (!isOwner && !invite) {
            return { error: 'Unauthorized' };
        }

        if (isOwner) {
            await prisma.show.update({
                where: { id: showId },
                data: { addedToAppleCalendar: true },
            });
        } else if (invite) {
            await prisma.showInvite.update({
                where: { id: invite.id },
                data: { addedToAppleCalendar: true },
            });
        }

        const start = show.startDate;
        const end = show.endDate;

        if (!start || !end) return { error: 'Invalid dates' };

        // Create a date for the end of the event (exclusive)
        const exclusiveEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);

        const event: EventAttributes = {
            start: [start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()],
            end: [exclusiveEnd.getUTCFullYear(), exclusiveEnd.getUTCMonth() + 1, exclusiveEnd.getUTCDate()], // +1 because end is exclusive in ICS usually, or check ics package docs.
            // Actually, for all-day events, 'end' is exclusive. So if show is Jan 1 - Jan 3, we want Jan 4 as end.
            // Let's verify standard behavior. usually yes, exclusive end date for all day.

            title: show.name,
            description: `Show in ${show.city}, ${show.state || show.country}`,
            location: `${show.city}, ${show.state ? show.state + ', ' : ''}${show.country}`,
            calName: 'ManeAccount Show',
            status: 'CONFIRMED',
            busyStatus: 'BUSY',
            organizer: { name: show.user.name || 'ManeAccount', email: show.user.email || '' },
        };

        const { error, value } = createEvents([event]);

        if (error) {
            console.error('ICS generation error:', error);
            return { error: 'Failed to generate calendar file' };
        }

        revalidatePath('/dashboard');
        return { success: true, icsData: value, filename: `${show.name.replace(/[^a-z0-9]/gi, '_')}.ics` };
    } catch (error) {
        console.error('Generate ICS error:', error);
        return { error: 'Failed to generate calendar file' };
    }
}
