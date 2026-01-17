import { prisma } from './prisma';
import { SubscriptionTier } from '@prisma/client';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

export async function getBraiderUsage(braiderId: string, subscriptionTier: SubscriptionTier, referenceDate: Date = new Date()) {
    let startDate: Date;
    let endDate: Date;
    let limit: number;
    let period: 'week' | 'day' | 'unlimited';

    if (subscriptionTier === 'enterprise') {
        return { count: 0, limit: Infinity, period: 'unlimited' };
    }

    if (subscriptionTier === 'starter') {
        // Weekly limit (Sunday start)
        startDate = startOfWeek(referenceDate, { weekStartsOn: 0 });
        endDate = endOfWeek(referenceDate, { weekStartsOn: 0 });
        limit = 50;
        period = 'week';
    } else {
        // Professional: Daily limit
        startDate = startOfDay(referenceDate);
        endDate = endOfDay(referenceDate);
        limit = 50;
        period = 'day';
    }

    const assignments = await prisma.jobAssignment.findMany({
        where: {
            job: {
                braiderId: braiderId,
            },
            canceledAt: null,
        },
        include: { job: true, services: true },
    });

    const count = assignments.filter(
        (assignment) =>
            (assignment.job.status === 'accepted' || assignment.job.status === 'completed') &&
            !assignment.canceledAt &&
            assignment.services.filter((s) => !assignment.canceledServiceIds.includes(s.id)).length ===
                [...new Set(assignment.completedServiceIds.filter((id) => !assignment.canceledServiceIds.includes(id)))].length &&
            assignment.completedServiceIds.length > 0 &&
            assignment.updatedAt >= startDate &&
            assignment.updatedAt <= endDate,
    ).length;

    return { count, limit, period };
}
