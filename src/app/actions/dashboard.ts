'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay } from 'date-fns';

export async function getFullDashboardData(role: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
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

        if (!user) return { error: 'User not found' };

        let jobsWhereClause: any = {};
        if (role === 'barn') jobsWhereClause = { barnId: user.id };
        else if (role === 'braider') jobsWhereClause = { braiderId: user.id };
        else if (role === 'subcontractor') jobsWhereClause = { subcontractors: { some: { id: user.id } } };

        const jobsData = await prisma.job.findMany({
            where: jobsWhereClause,
            include: {
                barn: true,
                braider: {
                    include: {
                        services: true,
                    },
                },
                subcontractors: true,
                show: true,
                assignments: {
                    include: {
                        horse: {
                            include: {
                                client: true,
                            },
                        },
                        services: true,
                        subcontractor: true,
                        customCharges: true,
                    },
                },
                notes: {
                    include: { author: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const ownedShows = user.shows.map((s) => ({ ...s, isOwner: true }));
        const invitedShows = user.receivedShowInvites.map((invite) => ({
            ...invite.show,
            isOwner: false,
            inviteStatus: invite.status,
            inviteId: invite.id,
            inviterName: invite.show.user.name,
            addedToGoogleCalendar: invite.addedToGoogleCalendar,
            addedToAppleCalendar: invite.addedToAppleCalendar,
            addedToOutlook: invite.addedToOutlook,
        }));

        const showsData = [...ownedShows, ...invitedShows].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        return {
            shows: showsData,
            jobs: jobsData,
            success: true,
        };
    } catch (error) {
        console.error('Get full dashboard data error:', error);
        return { error: 'Failed to fetch dashboard data' };
    }
}

export async function getDashboardData(role: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const today = startOfDay(new Date());

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                shows: {
                    where: {
                        endDate: { gte: today },
                    },
                    include: {
                        invites: { include: { invitee: true, inviter: true } },
                    },
                    orderBy: { startDate: 'asc' },
                },
                receivedShowInvites: {
                    where: {
                        status: { in: ['accepted', 'pending'] },
                        show: { endDate: { gte: today } },
                    },
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

        if (!user) return { error: 'User not found' };

        let jobsWhereClause: any = {};
        if (role === 'barn') {
            jobsWhereClause = {
                barnId: user.id,
                OR: [{ status: { not: 'completed' } }, { assignments: { some: { paidAt: null, canceledAt: null } } }],
            };
        } else if (role === 'braider') {
            jobsWhereClause = {
                braiderId: user.id,
                OR: [{ status: { not: 'completed' } }, { assignments: { some: { paidAt: null, canceledAt: null } } }],
            };
        } else if (role === 'subcontractor') {
            jobsWhereClause = {
                subcontractors: { some: { id: user.id } },
                OR: [{ status: { not: 'completed' } }, { assignments: { some: { paidAt: null, canceledAt: null } } }],
            };
        }

        const jobsData = await prisma.job.findMany({
            where: jobsWhereClause,
            include: {
                barn: true,
                braider: {
                    include: {
                        services: true,
                    },
                },
                subcontractors: true,
                show: true,
                assignments: {
                    include: {
                        horse: {
                            include: {
                                client: true,
                            },
                        },
                        services: true,
                        subcontractor: true,
                        customCharges: true,
                    },
                },
                notes: {
                    include: { author: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

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
        console.error('Get optimized dashboard data error:', error);
        return { error: 'Failed to fetch dashboard data' };
    }
}
