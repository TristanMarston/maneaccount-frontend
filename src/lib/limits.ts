import { prisma } from './prisma';
import { SubscriptionTier } from '@prisma/client';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

export async function getBraiderUsage(
    braiderId: string,
    subscriptionTier: SubscriptionTier,
    referenceDate: Date = new Date(),
    timezoneOffset: number = 0, // Minutes from UTC (e.g. 480 for PST)
) {
    let startDate: Date;
    let endDate: Date;
    let limit: number;
    let period: 'week' | 'day' | 'unlimited';

    if (subscriptionTier === 'enterprise') {
        return { count: 0, limit: Infinity, period: 'unlimited' };
    }

    const localDate = new Date(referenceDate.getTime() - timezoneOffset * 60000);

    if (subscriptionTier === 'starter') {
        // Weekly limit (Sunday start)
        const localStart = startOfWeek(localDate, { weekStartsOn: 0 });
        const localEnd = endOfWeek(localDate, { weekStartsOn: 0 });

        // Convert back to UTC for database comparison
        // startDate = new Date(localStart.getTime() + timezoneOffset * 60000);
        // endDate = new Date(localEnd.getTime() + timezoneOffset * 60000);
        startDate = localStart;
        endDate = localEnd;
        limit = 50;
        period = 'week';
    } else {
        // Professional: Daily limit
        const localStart = startOfDay(localDate);
        const localEnd = endOfDay(localDate);

        // Convert back to UTC for database comparison
        // startDate = new Date(localStart.getTime() + timezoneOffset * 60000);
        // endDate = new Date(localEnd.getTime() + timezoneOffset * 60000);
        startDate = localStart;
        endDate = localEnd;
        limit = 50;
        period = 'day';
    }

    // const assignments = await prisma.jobAssignment.findMany({
    //     where: {
    //         job: {
    //             braiderId: braiderId,
    //         },
    //         canceledAt: null,
    //     },
    //     include: { job: true, services: true },
    // });
    const assignments = await prisma.jobAssignment.findMany({
        where: {
            job: {
                braiderId: braiderId,
            },
            canceledAt: null,
        },
        include: {
            job: {
                include: {
                    show: true,
                },
            },
            services: true,
            horse: true,
        },
    });

    const count = assignments.filter(
        (assignment) =>
            assignment.job.status !== 'editing' &&
            assignment.status !== 'denied' &&
            assignment.status !== 'canceled' &&
            assignment.status !== 'pending' &&
            !assignment.canceledAt &&
            assignment.services.filter((s) => !assignment.canceledServiceIds.includes(s.id)).length ===
                [...new Set(assignment.completedServiceIds.filter((id) => !assignment.canceledServiceIds.includes(id)))].length &&
            assignment.completedServiceIds.length > 0 &&
            assignment.completedAt &&
            assignment.completedAt >= startDate &&
            assignment.completedAt <= endDate,
    ).length;

    // console.log(
    //     assignments
    //         .filter(
    //             (assignment) =>
    //                 assignment.job.status !== 'editing' &&
    //                 assignment.status !== 'denied' &&
    //                 assignment.status !== 'canceled' &&
    //                 assignment.status !== 'pending' &&
    //                 !assignment.canceledAt &&
    //                 assignment.services.filter((s) => !assignment.canceledServiceIds.includes(s.id)).length ===
    //                     [...new Set(assignment.completedServiceIds.filter((id) => !assignment.canceledServiceIds.includes(id)))].length &&
    //                 assignment.completedServiceIds.length > 0 &&
    //                 assignment.updatedAt >= startDate &&
    //                 assignment.updatedAt <= endDate,
    //         )
    //         .map((assignment) => ({
    //             assignmentDate: assignment.assignmentDate,
    //             completedServiceIds: assignment.completedServiceIds,
    //             canceledServiceIds: assignment.canceledServiceIds,
    //             updatedAt: assignment.updatedAt,
    //             status: assignment.status,
    //             createdAt: assignment.createdAt,
    //             canceledAt: assignment.canceledAt,
    //             showName: assignment.horse.showName,
    //             barnName: assignment.horse.barnName,
    //             show: assignment.job.show.name,
    //             jobStatus: assignment.job.status,
    //             services: assignment.services.length,
    //         }))
    //         .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    //         .splice(0, 10),
    // );

    return { count, limit, period };
}
