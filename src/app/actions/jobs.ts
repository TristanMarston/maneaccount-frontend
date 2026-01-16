'use server';

import { JobStatus, JobAssignment } from '@prisma/client';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { createNotification } from './notifications';
import { NotificationType } from '@prisma/client';

export async function createJob(data: { braiderId: string; showId: string; assignments: { horseId: string; serviceIds: string[] }[] }) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const barn = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!barn) return { error: 'User not found' };

        if (!data.braiderId || !data.showId || data.assignments.length === 0) {
            return { error: 'Missing required fields' };
        }

        const job = await prisma.job.create({
            data: {
                barnId: barn.id,
                braiderId: data.braiderId,
                showId: data.showId,
                status: 'pending',
                assignments: {
                    create: data.assignments.map((assignment) => ({
                        horse: { connect: { id: assignment.horseId } },
                        services: {
                            connect: assignment.serviceIds.map((id) => ({ id })),
                        },
                    })),
                },
            },
            include: { show: true },
        });

        await createNotification(data.braiderId, NotificationType.job_request, `${barn.name} requested work for ${job.show.name}`, job.id, barn.id);

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Create job error:', error);
        return { error: 'Failed to request work' };
    }
}

export async function getJobs(email: string, role: string) {
    if (!email) return [];

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return [];

        let whereClause: any = {};
        if (role === 'barn') whereClause = { barnId: user.id };
        else if (role === 'braider') whereClause = { braiderId: user.id };
        else if (role === 'subcontractor') whereClause = { subcontractors: { some: { id: user.id } } };
        else return [];

        const jobs = await prisma.job.findMany({
            where: whereClause,
            include: {
                barn: true,
                braider: true,
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

export async function updateJobStatus(
    jobId: string,
    status: JobStatus,
    data?: {
        scheduledDate?: Date;
        subcontractorIds?: string[];
    }
) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const updateData: any = { status };
        if (data?.scheduledDate) updateData.scheduledDate = data.scheduledDate;
        if (data?.subcontractorIds) {
            updateData.subcontractors = {
                set: data.subcontractorIds.map((id) => ({ id })),
            };
        }

        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: updateData,
            include: { braider: true, subcontractors: true, barn: true, show: true },
        });

        if (status === 'accepted' || status === 'denied') {
            await createNotification(
                updatedJob.barnId,
                NotificationType.job_status_change,
                `${updatedJob.braider.name} ${status} your job request for ${updatedJob.show.name}`,
                jobId,
                updatedJob.braiderId,
                updatedJob.braider.image,
            );
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Update job error:', error);
        return { error: 'Failed to update job' };
    }
}

export async function toggleServiceCompletion(assignmentId: string, serviceId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const assignment = await prisma.jobAssignment.findUnique({
            where: { id: assignmentId },
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

        await prisma.jobAssignment.update({
            where: { id: assignmentId },
            data: { completedServiceIds },
        });

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
            await createNotification(participantId!, NotificationType.new_message, `New message from ${user.name} ${job ? `on ${job.show.name} job` : ''}`, jobId, user.id);
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Add note error:', error);
        return { error: 'Failed to add note' };
    }
}
export async function markJobCompleted(jobId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const job = await prisma.job.update({
            where: { id: jobId },
            data: { status: 'completed' },
            include: { braider: true, subcontractors: true },
        });

        await createNotification(
            job.barnId,
            NotificationType.job_completed,
            `Job completed by ${job.subcontractors.length > 0 ? job.subcontractors.map((s) => s.name).join(', ') : job.braider.name}. Please pay the invoice.`,
            jobId,
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
export async function markJobPaid(jobId: string, paymentPlatform: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const job = await prisma.job.findUnique({ where: { id: jobId }, include: { show: true } });

        if (job) {
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    paidAt: new Date(),
                    paymentPlatform,
                },
            });

            createNotification(job.braiderId, NotificationType.job_paid, `The ${job.show.name} job has been paid for`, jobId, job.barnId);

            revalidatePath('/dashboard');
            return { success: true };
        }

        return { error: 'Job not found' };
    } catch (error) {
        console.error('Mark paid error:', error);
        return { error: 'Failed to mark job as paid' };
    }
}

export async function getBraiderData(braiderId: string) {
    try {
        const braider = await prisma.user.findUnique({
            where: { id: braiderId },
            include: {
                shows: {
                    where: { endDate: { gte: subDays(new Date(), 1) } },
                    orderBy: { startDate: 'asc' },
                },
                services: true,
            },
        });

        return braider;
    } catch (error) {
        return null;
    }
}
export async function cancelJob(jobId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'canceled' },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Cancel job error:', error);
        return { error: 'Failed to cancel job' };
    }
}
export async function reRequestJob(jobId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'pending' },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Re-request job error:', error);
        return { error: 'Failed to re-request job' };
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
        // Find current assignment to get the current subcontractor
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

        const data: any = {};
        if (assignment.canceledServiceIds.length === assignment.services.length) data.canceledServiceIds = [];
        data.canceledAt = assignment.canceledAt || (data.canceledServicesIds && data.canceledServiceIds.length === 0) ? null : new Date();

        await prisma.jobAssignment.update({
            where: { id: assignmentId },
            data,
        });

        revalidatePath('/dashboard');
        return { success: true, message: data.canceledAt ? 'Removed horse from job' : 'Restored horse to job' };
    } catch (error) {
        console.error('Cancel assignment error:', error);
        return { error: 'Failed to update assignment' };
    }
}

export async function cancelAssignmentService(assignmentId: string, serviceId: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const assignment = await prisma.jobAssignment.findUnique({ where: { id: assignmentId } });
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

        await prisma.jobAssignment.update({
            where: { id: assignmentId },
            data: { canceledServiceIds },
        });

        revalidatePath('/dashboard');
        return { success: true, message };
    } catch (error) {
        console.error('Cancel service error:', error);
        return { error: 'Failed to update service' };
    }
}
