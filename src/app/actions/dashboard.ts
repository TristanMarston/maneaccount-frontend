'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export async function getDashboardData(role: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    const email = session.user.email;

    try {
        // Fetch User with Shows and Received Invites
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                shows: {
                    include: {
                        days: true,
                        invites: { include: { invitee: true, inviter: true } },
                    },
                    orderBy: { startDate: 'asc' },
                },
                receivedShowInvites: {
                    where: { status: { in: ['accepted', 'pending'] } },
                    include: {
                        show: {
                            include: {
                                days: true,
                                invites: { include: { invitee: true, inviter: true } },
                                user: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) return { error: 'User not found' };

        // Fetch Jobs
        let jobsWhereClause: any = {};
        if (role === 'client') jobsWhereClause = { clientId: user.id };
        else if (role === 'braider') jobsWhereClause = { braiderId: user.id };
        else if (role === 'subcontractor') jobsWhereClause = { subcontractorId: user.id };

        const jobsData = await prisma.job.findMany({
            where: jobsWhereClause,
            include: {
                client: true,
                braider: true,
                subcontractor: true,
                show: true,
                assignments: {
                    include: {
                        horse: true,
                        services: true,
                    },
                },
                notes: {
                    include: { author: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Map Show Data
        const ownedShows = user.shows.map((s) => ({ ...s, isOwner: true }));
        const invitedShows = user.receivedShowInvites.map((invite) => ({
            ...invite.show,
            isOwner: false,
            inviteStatus: invite.status,
            inviteId: invite.id,
            inviterName: invite.show.user.name,
        }));

        const showsData = [...ownedShows, ...invitedShows].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        return {
            shows: showsData,
            jobs: jobsData,
            success: true,
        };
    } catch (error) {
        console.error('Get dashboard data error:', error);
        return { error: 'Failed to fetch dashboard data' };
    }
}
