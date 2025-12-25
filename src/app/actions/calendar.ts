'use server';

import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';
import { PrismaPg } from '@prisma/adapter-pg';
import { google } from 'googleapis';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        }),
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

type ShowDayInput = {
    date: Date;
    startTime: string;
    endTime: string;
    skipped?: boolean;
};

type CreateShowInput = {
    name: string;
    country: string;
    state?: string;
    city: string;
    days: ShowDayInput[];
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

//         if (!account || !account.access_token) {
//             console.log('No linked Google account found for calendar sync.');
//             return;
//         }

//         // 2. Setup Google OAuth Client
//         const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

//         auth.setCredentials({
//             access_token: account.access_token,
//             refresh_token: account.refresh_token,
//             // If expiry is stored as Int (seconds) or BigInt, convert if necessary.
//             // Prisma 'expires_at' is usually Int (seconds since epoch or seconds duration).
//             // Google expects expiry_date in ms.
//             expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
//         });

//         const calendar = google.calendar({ version: 'v3', auth });

//         // 3. Iterate through days and create events
//         for (const day of days) {
//             // Construct DateTimes for Google (ISO format)
//             // day.date is the base date, startTime is "HH:mm"

//             // Helper to combine date + time string into ISO string
//             const startDateTime = combineDateAndTime(day.date, day.startTime);
//             const endDateTime = combineDateAndTime(day.date, day.endTime);

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

//             // 4. Insert Event
//             const response = await calendar.events.insert({
//                 calendarId: 'primary', // Use the user's main calendar
//                 requestBody: event,
//             });

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        // 1. Determine overall start/end dates from the days array
        if (data.days.length === 0) return { error: 'At least one day is required' };

        // Sort days to find range
        const sortedDays = [...data.days].sort((a, b) => a.date.getTime() - b.date.getTime());
        const startDate = sortedDays[0].date;
        const endDate = sortedDays[sortedDays.length - 1].date;

        // 2. Create Show in Database
        const newShow = await prisma.show.create({
            data: {
                user: { connect: { email: session.user.email } },
                name: data.name,
                country: data.country,
                state: data.state,
                city: data.city,
                startDate,
                endDate,
                days: {
                    create: data.days.map((day) => ({
                        date: day.date,
                        startTime: day.startTime,
                        endTime: day.endTime,
                        skipped: day.skipped,
                    })),
                },
            },
            include: { days: true },
        });

        // await syncToGoogleCalendar(session.user.id, newShow, newShow.days);

        revalidatePath('/dashboard');
        return { success: true, show: newShow };
    } catch (error) {
        console.error('Create show error:', error);
        return { error: 'Failed to create show' };
    }
}

export async function getShows(email: string) {
    if (!email) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                shows: {
                    include: { days: true },
                    orderBy: { startDate: 'asc' },
                },
            },
        });

        return user?.shows || [];
    } catch (error) {
        console.error('Get shows error:', error);
        return [];
    }
}
export async function updateShow(id: string, data: CreateShowInput) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        if (data.days.length === 0) return { error: 'At least one day is required' };

        const sortedDays = [...data.days].sort((a, b) => a.date.getTime() - b.date.getTime());
        const startDate = sortedDays[0].date;
        const endDate = sortedDays[sortedDays.length - 1].date;

        const updatedShow = await prisma.$transaction(async (tx) => {
            await tx.showDay.deleteMany({
                where: { showId: id },
            });

            return await tx.show.update({
                where: { id },
                data: {
                    name: data.name,
                    country: data.country,
                    state: data.state,
                    city: data.city,
                    startDate,
                    endDate,
                    days: {
                        create: data.days.map((day) => ({
                            date: day.date,
                            startTime: day.startTime,
                            endTime: day.endTime,
                            skipped: day.skipped,
                        })),
                    },
                },
                include: { days: true },
            });
        });

        revalidatePath('/dashboard');
        return { success: true, show: updatedShow };
    } catch (error) {
        console.error('Update show error:', error);
        return { error: 'Failed to update show' };
    }
}

export async function deleteShow(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.show.delete({
            where: { id },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Delete show error:', error);
        return { error: 'Failed to delete show' };
    }
}
