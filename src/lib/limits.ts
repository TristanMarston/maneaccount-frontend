// limits.ts

import { prisma } from './prisma';
import { SubscriptionTier } from '@prisma/client';
import { getUserDayBoundsUTC, getUserWeekBoundsUTC } from './date-utils';

export async function getBraiderUsage(braiderId: string, subscriptionTier: SubscriptionTier, referenceDate: Date = new Date()) {
    if (subscriptionTier === 'enterprise') {
        return { count: 0, limit: Infinity, period: 'unlimited' as const };
    }

    // browser's getTimezoneOffset() is the negation of the UTC offset:
    // PST = UTC-8, getTimezoneOffset() = +480. We need utcOffset = -480.
    const utcOffsetMinutes = -new Date().getTimezoneOffset();

    let startDate: Date;
    let endDate: Date;
    let limit: number;
    let period: 'week' | 'day';

    if (subscriptionTier === 'starter') {
        [startDate, endDate] = getUserWeekBoundsUTC(referenceDate);
        limit = 50;
        period = 'week';
    } else {
        // professional
        [startDate, endDate] = getUserDayBoundsUTC(referenceDate);
        limit = 50;
        period = 'day';
    }

    // Query only the relevant window directly in the DB — no in-memory filtering
    const count = await prisma.jobAssignment.count({
        where: {
            job: { braiderId, status: { not: 'editing' } },
            canceledAt: null,
            status: { notIn: ['denied', 'canceled', 'pending'] },
            completedAt: {
                gte: startDate,
                lt: endDate,
            },
            completedServiceIds: { isEmpty: false },
        },
    });

    return { count, limit, period };
}
