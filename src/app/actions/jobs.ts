'use server';

import { JobStatus, JobAssignment, AssignmentStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { format, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { createNotification } from './notifications';
import { NotificationType } from '@prisma/client';
import { getBraiderUsage } from '@/lib/limits';
import { normalizeDateToUTC, getLocalTodayStart, parseUTCToLocal } from '@/lib/date-utils';

export async function createJob(data: { braiderId: string; showId: string; assignments: { horseId: string; serviceIds: string[]; date: Date }[] }, timezoneOffset: number = 0) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const barn = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!barn) return { error: 'User not found' };

        if (!data.braiderId || !data.showId) {
            return { error: 'Missing required fields' };
        }

        const job = await prisma.job.create({
            data: {
                barnId: barn.id,
                braiderId: data.braiderId,
                showId: data.showId,
                status: 'editing',
                assignments: {
                    create: data.assignments.map((assignment) => ({
                        horse: { connect: { id: assignment.horseId } },
                        services: {
                            connect: assignment.serviceIds.map((id) => ({ id })),
                        },
                        assignmentDate: assignment.date,
                    })),
                },
            },
            include: { show: true },
        });

        revalidatePath('/dashboard');
        return { success: true, jobId: job.id };
    } catch (error) {
        console.error('Create job error:', error);
        return { error: 'Failed to create job draft' };
    }
}

export async function updateJobDraft(jobId: string, assignments: { horseId: string; serviceIds: string[]; date: Date }[]) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { barn: true },
        });

        if (!job) return { error: 'Job not found' };
        if (job.status !== 'editing') return { error: 'Cannot edit submitted job' };
        if (job.barn.email !== session.user.email) return { error: 'Unauthorized' };

        await prisma.job.update({
            where: { id: jobId },
            data: {
                assignments: {
                    deleteMany: {},
                    create: assignments.map((assignment) => ({
                        horse: { connect: { id: assignment.horseId } },
                        services: {
                            connect: assignment.serviceIds.map((id) => ({ id })),
                        },
                        assignmentDate: assignment.date,
                    })),
                },
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Update job draft error:', error);
        return { error: 'Failed to update job draft' };
    }
}

export async function submitJob(jobId: string, timezoneOffset: number = 0) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                barn: true,
                braider: true,
                show: true,
                assignments: true,
            },
        });

        if (!job) return { error: 'Job not found' };

        const { count, limit, period } = await getBraiderUsage(job.braiderId, job.braider.subscriptionTier, new Date(), timezoneOffset);
        const newHorsesCount = job.assignments.length;

        if (period !== 'unlimited' && count + newHorsesCount > limit) {
            await createNotification(
                job.braiderId,
                NotificationType.limit_exceeded,
                `${job.barn.name}'s service request was denied because it exceeds your ${period === 'week' ? 'weekly ' : period === 'day' ? 'daily ' : ''}limit`,
                null,
                job.barn.id,
            );
            return { error: `Request exceeds braider's limit of ${limit} horses per ${period}. Sorry!` };
        }

        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'submitted' },
        });

        await createNotification(job.braiderId, NotificationType.job_request, `${job.barn.name} requested work for ${job.show.name}`, job.id, job.barn.id);

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Submit job error:', error);
        return { error: 'Failed to submit job' };
    }
}

export async function getJobs(email: string, role: string) {
    if (!email) return [];

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return [];

        let whereClause: any = {};
        if (role === 'barn') whereClause = { barnId: user.id };
        else if (role === 'braider') whereClause = { braiderId: user.id, status: { in: ['submitted', 'completed'] } };
        else if (role === 'subcontractor') whereClause = { subcontractors: { some: { id: user.id } }, status: { in: ['submitted', 'completed'] } };
        else return [];

        const jobs = await prisma.job.findMany({
            where: whereClause,
            include: {
                barn: true,
                braider: {
                    include: {
                        services: true,
                    },
                },
                subcontractors: true,
                show: {
                    include: {
                        invites: true,
                    },
                },
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
        return jobs;
    } catch (error) {
        console.error('Get jobs error:', error);
        return [];
    }
}

export async function updateAssignmentStatus(assignmentId: string, status: AssignmentStatus) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const {
            job: originalJob,
            horse,
            assignmentDate,
        } = await prisma.jobAssignment.update({
            where: { id: assignmentId },
            data: { status },
            include: { job: { include: { braider: true, show: true } }, horse: true },
        });

        if (originalJob) {
            await createNotification(
                originalJob.barnId,
                NotificationType.horse_status_change,
                status === 'accepted'
                    ? `${originalJob.braider.name} accepted ${horse.barnName} for ${format(parseUTCToLocal(assignmentDate) || assignmentDate, 'EEE do')} for ${originalJob.show.name}`
                    : `${originalJob.braider.name} declined ${horse.barnName} for ${format(parseUTCToLocal(assignmentDate) || assignmentDate, 'EEE do')} for ${originalJob.show.name}`,
                null,
                originalJob.braiderId,
                null,
            );
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Update assignment error:', error);
        return { error: 'Failed to update assignment' };
    }
}

export async function acceptAllPendingAssignments(assignmentIds: string[], jobId?: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.jobAssignment.updateMany({
            where: { id: { in: assignmentIds } },
            data: { status: 'accepted' },
        });

        if (assignmentIds.length > 0 && jobId) {
            const originalJob = await prisma.job.findFirst({ where: { id: jobId }, include: { show: true, braider: true } });
            if (originalJob)
                await createNotification(
                    originalJob.barnId,
                    NotificationType.horse_status_change,
                    `${originalJob.braider.name} accepted ${assignmentIds.length} horse${assignmentIds.length !== 1 ? 's' : ''} for ${originalJob.show.name}`,
                    null,
                    originalJob.braiderId,
                    null,
                );
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Update assignment error:', error);
        return { error: 'Failed to update assignment' };
    }
}

export async function toggleServiceCompletion(assignmentId: string, serviceId: string, timezoneOffset: number = 0, whoCompleted: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const assignment = await prisma.jobAssignment.findUnique({
            where: { id: assignmentId },
            include: { services: true, job: { include: { braider: true } } },
        });
        if (!assignment) return { error: 'Assignment not found' };

        let successMessage = '';
        let completedServiceIds = assignment.completedServiceIds || [];
        if (completedServiceIds.includes(serviceId)) {
            completedServiceIds = completedServiceIds.filter((id) => id !== serviceId);
            successMessage = 'Marked as incomplete';
        } else {
            completedServiceIds.push(serviceId);
            successMessage = 'Marked as complete';
        }

        const isComplete =
            assignment.services.filter((s) => !assignment.canceledServiceIds.includes(s.id)).length ===
                [...new Set(completedServiceIds.filter((id) => !assignment.canceledServiceIds.includes(id)))].length && completedServiceIds.length > 0;

        if (isComplete) {
            const { count, limit, period } = await getBraiderUsage(assignment.job.braiderId, assignment.job.braider.subscriptionTier, new Date(), timezoneOffset);
            const newCount = successMessage === 'Marked as incomplete' ? count - 1 : successMessage === 'Marked as complete' ? count + 1 : count;

            if (period !== 'unlimited') {
                if (newCount === 48) {
                    await createNotification(
                        assignment.job.braiderId,
                        NotificationType.limit_approaching,
                        `${whoCompleted === 'braider' ? 'You have' : whoCompleted === 'subcontractor' ? 'Your braider has' : 'You have'} serviced ${newCount} horses out of ${whoCompleted === 'braider' ? 'your' : whoCompleted === 'subcontractor' ? 'their' : 'your'} ${limit} ${period === 'week' ? 'weekly' : period === 'day' ? 'daily' : 'weekly'} limit.`,
                        null,
                        null,
                        null,
                        timezoneOffset,
                    );
                } else if (newCount > 50) {
                    return {
                        error: `${whoCompleted === 'braider' ? 'You have' : whoCompleted === 'subcontractor' ? 'Your braider has' : 'You have'} reached ${whoCompleted === 'braider' ? 'your' : whoCompleted === 'subcontractor' ? 'their' : 'your'} limit of 50 horses per ${period === 'week' ? 'week' : 'day'}.`,
                    };
                }
            }
        }

        const assignmentInfo = await prisma.jobAssignment.update({
            where: { id: assignmentId },
            data: {
                completedServiceIds,
                completedAt: isComplete ? new Date() : null,
            },
            include: { subcontractor: true, job: { include: { show: true } }, horse: true },
        });

        if (whoCompleted === 'subcontractor' && isComplete) {
            const { subcontractor, job: originalJob, horse, assignmentDate } = assignmentInfo;
            if (subcontractor) {
                await createNotification(
                    originalJob.braiderId,
                    NotificationType.horse_sub_completed,
                    `${subcontractor.name} has finished servicing ${horse.barnName} for ${format(parseUTCToLocal(assignmentDate) || assignmentDate, 'EEE do')} for ${originalJob.show.name}`,
                    null,
                    subcontractor.id,
                );
            }
        }

        revalidatePath('/dashboard');
        return { success: true, message: successMessage };
    } catch (error) {
        console.error('Toggle completion error:', error);
        return { error: 'Failed to update service completion' };
    }
}
export async function addNote(jobId: string, content: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return { error: 'User not found' };

        const note = await prisma.note.create({
            data: {
                jobId,
                authorId: user.id,
                content,
            },
            include: { job: { include: { braider: true, barn: true, subcontractors: true } } },
        });

        const job = await prisma.job.findUnique({ where: { id: jobId }, include: { show: true } });
        const participants = [note.job.braiderId, note.job.barnId, ...note.job.subcontractors.map((s) => s.id)].filter((id) => id && id !== user.id);
        for (const participantId of participants) {
            await createNotification(participantId!, NotificationType.new_message, `New message from ${user.name} ${job ? `on ${job.show.name} job` : ''}`, note.id, user.id);
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Add note error:', error);
        return { error: 'Failed to add note' };
    }
}
export async function markJobCompleted(jobId: string, thanksMessage?: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const data: any = { status: 'completed', invoiceSentAt: new Date() };
        if (thanksMessage) data.thanksMessage = thanksMessage;

        const job = await prisma.job.update({
            where: { id: jobId },
            data,
            include: { braider: true },
        });

        await createNotification(
            job.barnId,
            NotificationType.job_completed,
            `Job completed by ${job.braider.name}. Clients have received the invoice.`,
            job.id,
            job.braiderId,
            job.braider.image,
        );

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Mark completed error:', error);
        return { error: 'Failed to mark job as completed' };
    }
}

export async function addCustomCharge(assignmentId: string, name: string, amount: number) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.customCharge.create({
            data: {
                assignmentId,
                name,
                amount,
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Add custom charge error:', error);
        return { error: 'Failed to add custom charge' };
    }
}

export async function removeCustomCharge(chargeId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.customCharge.delete({
            where: { id: chargeId },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Remove custom charge error:', error);
        return { error: 'Failed to remove custom charge' };
    }
}

export async function addAssignmentsToJob(jobId: string, assignments: { horseId: string; serviceIds: string[]; date: Date }[]) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { barn: true, braider: true, show: true, assignments: true },
        });

        if (!job) return { error: 'Job not found' };
        if (job.status === 'completed') return { error: 'Cannot add to completed job' };

        const timezoneOffset = new Date().getTimezoneOffset();

        const { count, limit, period } = await getBraiderUsage(job.braiderId, job.braider.subscriptionTier, new Date(), timezoneOffset);
        const newHorsesCount = assignments.length;

        if (period !== 'unlimited' && count + newHorsesCount > limit) {
            await createNotification(
                job.braiderId,
                NotificationType.limit_exceeded,
                `${job.barn.name}'s service request was denied because it exceeds your ${period === 'week' ? 'weekly ' : period === 'day' ? 'daily ' : ''}limit`,
                null,
                job.barn.id,
            );
            return { error: `Request exceeds braider's limit of ${limit} horses per ${period}. Sorry!` };
        }

        for (const a of assignments) {
            await prisma.jobAssignment.create({
                data: {
                    jobId,
                    horseId: a.horseId,
                    assignmentDate: a.date,
                    status: 'pending',
                    services: {
                        connect: a.serviceIds.map((id) => ({ id })),
                    },
                },
            });
        }

        await createNotification(
            job.braiderId,
            NotificationType.job_status_change,
            `${job.barn.name} added ${assignments.length} horse(s) to ${job.show.name}`,
            job.id,
            job.barn.id,
            job.barn.image,
        );

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Add assignments error:', error);
        return { error: 'Failed to add assignments' };
    }
}

export async function getBraiderData(braiderId: string) {
    try {
        const braider = await prisma.user.findUnique({
            where: { id: braiderId },
            include: {
                shows: {
                    where: { endDate: { gte: getLocalTodayStart(0) } },
                    orderBy: { startDate: 'asc' },
                },
                services: true,
                braiderJobs: { include: { barn: true } },
            },
        });

        return braider;
    } catch (error) {
        return null;
    }
}

export async function getUserByEmail(email: string) {
    const session = await auth();
    if (!session?.user?.email) return null;
    if (!email) return null;

    return await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            name: true,
            email: true,
            image: true,
            emailVerified: true,
            publicID: true,
            role: true,
            phoneNumber: true,
            venmo: true,
            zelle: true,
            venmoEnabled: true,
            thanksMessage: true,
            allowedNotifications: true,
        },
    });
}

export async function cancelJob(jobId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.job.delete({
            where: { id: jobId },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Cancel job error:', error);
        return { error: 'Failed to cancel job' };
    }
}

export async function deleteJob(jobId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.job.delete({ where: { id: jobId } });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Delete job error:', error);
        return { error: 'Failed to delete job' };
    }
}

export async function assignSubcontractorToAssignment(assignmentId: string, subcontractorId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const currentAssignment = await prisma.jobAssignment.findUnique({
            where: { id: assignmentId },
            select: { subcontractorId: true, jobId: true },
        });

        const previousSubcontractorId = currentAssignment?.subcontractorId || '';

        const assignment = await prisma.jobAssignment.update({
            where: { id: assignmentId },
            data: { subcontractorId: subcontractorId.length > 0 ? subcontractorId : null },
            include: { job: { include: { braider: true, subcontractors: true } } },
        });

        if (subcontractorId.length > 0) {
            await prisma.job.update({
                where: { id: assignment.jobId },
                data: { subcontractors: { connect: { id: subcontractorId } } },
            });
            await createNotification(subcontractorId, NotificationType.job_request, `${assignment.job.braider.name} assigned you a horse`, assignment.jobId, assignment.job.braiderId);
        }

        if (previousSubcontractorId && previousSubcontractorId !== subcontractorId) {
            const remainingCount = await prisma.jobAssignment.count({
                where: {
                    jobId: assignment.jobId,
                    subcontractorId: previousSubcontractorId,
                },
            });

            if (remainingCount === 0) {
                await prisma.job.update({
                    where: { id: assignment.jobId },
                    data: { subcontractors: { disconnect: { id: previousSubcontractorId } } },
                });
            }
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Assign sub error:', error);
        return { error: 'Failed to assign subcontractor' };
    }
}

export async function cancelAssignment(assignmentId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const assignment = await prisma.jobAssignment.findUnique({ where: { id: assignmentId }, include: { services: true } });
        if (!assignment) return { error: 'Assignment not found' };

        const isSoftDeleted = assignment.status === 'denied' || assignment.status === 'canceled' || !!assignment.canceledAt;

        const data: any = {};
        if (isSoftDeleted) {
            // Restore
            data.status = 'accepted';
            data.canceledAt = null;
            data.canceledServiceIds = [];
        } else {
            data.status = 'canceled';
            data.canceledAt = new Date();
            data.completedServiceIds = [];
            data.completedAt = null;
        }

        await prisma.jobAssignment.update({
            where: { id: assignmentId },
            data,
        });

        revalidatePath('/dashboard');
        return { success: true, message: isSoftDeleted ? 'Restored horse to job' : 'Removed horse from job' };
    } catch (error) {
        console.error('Cancel assignment error:', error);
        return { error: 'Failed to update assignment' };
    }
}

export async function cancelAssignmentService(assignmentId: string, serviceId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const assignment = await prisma.jobAssignment.findUnique({
            where: { id: assignmentId },
            include: { services: true },
        });
        if (!assignment) return { error: 'Assignment not found' };

        let canceledServiceIds = assignment.canceledServiceIds || [];
        let message = '';

        if (canceledServiceIds.includes(serviceId)) {
            // Restore
            canceledServiceIds = canceledServiceIds.filter((id) => id !== serviceId);
            message = 'Service restored';
        } else {
            // Cancel
            canceledServiceIds.push(serviceId);

            // Also update completed to remove if canceling
            let completedServiceIds = assignment.completedServiceIds;
            if (completedServiceIds.includes(serviceId)) {
                completedServiceIds = completedServiceIds.filter((id) => id !== serviceId);
                await prisma.jobAssignment.update({
                    where: { id: assignmentId },
                    data: { completedServiceIds },
                });
            }
            message = 'Service canceled';
        }

        const isComplete =
            assignment.services.filter((s) => !canceledServiceIds.includes(s.id)).length ===
                [...new Set(assignment.completedServiceIds.filter((id) => !canceledServiceIds.includes(id)))].length && assignment.completedServiceIds.length > 0;

        await prisma.jobAssignment.update({
            where: { id: assignmentId },
            data: {
                canceledServiceIds,
                completedAt: isComplete ? new Date() : null,
            },
        });

        revalidatePath('/dashboard');
        return { success: true, message };
    } catch (error) {
        console.error('Cancel service error:', error);
        return { error: 'Failed to update service' };
    }
}
export async function getBraiderUsageAction(email: string, timezoneOffset: number = 0) {
    if (!email) return null;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const { count, limit, period } = await getBraiderUsage(user.id, user.subscriptionTier, new Date(), timezoneOffset);
        return { count, limit, period };
    } catch (error) {
        console.error('Get braider usage error:', error);
        return null;
    }
}

export async function markClientPaid(jobId: string, clientId: string | null, markPaid: boolean) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { assignments: { include: { horse: true } } },
        });

        if (!job) return { error: 'Job not found' };

        const assignmentIds = job.assignments.filter((a) => a.horse.clientId === clientId).map((a) => a.id);

        if (assignmentIds.length === 0) return { error: 'No assignments found for client' };

        await prisma.jobAssignment.updateMany({
            where: { id: { in: assignmentIds } },
            data: {
                paidAt: markPaid ? new Date() : null,
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Mark client paid error:', error);
        return { error: 'Failed to update payment status' };
    }
}

export async function getEarningsHistory(period: 'day' | 'week' | 'month' | 'year') {
    const session = await auth();
    if (!session?.user?.email) return [];

    try {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return [];

        const assignments = await prisma.jobAssignment.findMany({
            where: {
                job: { braiderId: user.id },
                paidAt: { not: null },
            },
            include: {
                services: true,
                customCharges: true,
            },
            orderBy: { paidAt: 'asc' },
        });

        // Helper to calculate assignment total
        const getAssignmentTotal = (a: any) => {
            const servicesTotal = a.services.filter((s: any) => !a.canceledServiceIds.includes(s.id)).reduce((acc: number, s: any) => acc + s.priceUSD, 0);
            const customTotal = a.customCharges.reduce((acc: number, c: any) => acc + c.amount, 0);
            return servicesTotal + customTotal;
        };

        const data: Record<string, number> = {};

        assignments.forEach((assignment) => {
            if (!assignment.paidAt) return;

            const date = new Date(assignment.paidAt);
            let key = '';

            if (period === 'day') {
                key = date.toISOString().split('T')[0];
            } else if (period === 'week') {
                const d = new Date(date);
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(d.setDate(diff));
                key = monday.toISOString().split('T')[0];
            } else if (period === 'month') {
                key = date.toISOString().slice(0, 7);
            } else if (period === 'year') {
                key = date.getFullYear().toString();
            }

            if (!data[key]) data[key] = 0;
            data[key] += getAssignmentTotal(assignment);
        });

        return Object.entries(data).map(([date, amount]) => ({ date, amount }));
    } catch (error) {
        console.error('Get earnings history error:', error);
        return [];
    }
}
