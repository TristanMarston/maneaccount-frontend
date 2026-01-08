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
        const client = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!client) return { error: 'User not found' };

        if (!data.braiderId || !data.showId || data.assignments.length === 0) {
            return { error: 'Missing required fields' };
        }

        const job = await prisma.job.create({
            data: {
                clientId: client.id,
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

        await createNotification(data.braiderId, NotificationType.job_request, `${client.name} requested work for ${job.show.name}`, job.id, client.id);

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
        if (role === 'client') whereClause = { clientId: user.id };
        else if (role === 'braider') whereClause = { braiderId: user.id };
        else if (role === 'subcontractor') whereClause = { subcontractorId: user.id };
        else return [];

        const jobs = await prisma.job.findMany({
            where: whereClause,
            include: {
                client: true,
                braider: true,
                subcontractor: true,
                show: {
                    include: {
                        invites: true,
                    },
                },
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
        subcontractorId?: string;
    }
) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const updateData: any = { status };
        if (data?.scheduledDate) updateData.scheduledDate = data.scheduledDate;
        if (data?.subcontractorId) updateData.subcontractorId = data.subcontractorId;

        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: updateData,
            include: { braider: true, subcontractor: true, client: true },
        });

        if (status === 'accepted' || status === 'denied') {
            await createNotification(
                updatedJob.clientId,
                NotificationType.job_status_change,
                `Your job request for ${updatedJob.braider.name} was ${status}`,
                jobId,
                updatedJob.braiderId
            );
        }

        if (status === 'sub_requested' && data?.subcontractorId) {
            await createNotification(data.subcontractorId, NotificationType.job_request, `${updatedJob.braider.name} delegated a job to you`, jobId, updatedJob.braiderId);
        }

        if (status === 'delegated' || status === 'sub_declined') {
            await createNotification(
                updatedJob.braiderId,
                NotificationType.job_status_change,
                `${updatedJob.subcontractor?.name} ${status === 'delegated' ? 'accepted' : 'declined'} the delegated job`,
                jobId,
                updatedJob.subcontractorId
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
            include: { job: { include: { braider: true, client: true, subcontractor: true } } },
        });

        const job = await prisma.job.findUnique({ where: { id: jobId }, include: { show: true } });
        const participants = [note.job.braiderId, note.job.clientId, note.job.subcontractorId].filter((id) => id && id !== user.id);
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
            include: { braider: true, subcontractor: true },
        });

        await createNotification(
            job.clientId,
            NotificationType.job_completed,
            `Job completed by ${job.subcontractor?.name || job.braider.name}. Please pay the invoice.`,
            jobId,
            job.braiderId
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

            createNotification(job.braiderId, NotificationType.job_paid, `The ${job.show.name} job has been paid for`, jobId, job.clientId);

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
