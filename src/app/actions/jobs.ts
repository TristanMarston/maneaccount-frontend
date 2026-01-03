'use server';

import { JobStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { subDays } from 'date-fns';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function createJob(data: { braiderId: string; showId: string; assignments: { horseId: string; serviceIds: string[] }[] }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const client = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!client) return { error: 'User not found' };

        if (!data.braiderId || !data.showId || data.assignments.length === 0) {
            return { error: 'Missing required fields' };
        }

        await prisma.job.create({
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
        });

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
        else return []; // Admin or unknown

        const jobs = await prisma.job.findMany({
            where: whereClause,
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
        scheduledStartTime?: Date;
        scheduledEndTime?: Date;
        subcontractorId?: string;
    }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const updateData: any = { status };
        if (data?.scheduledStartTime) updateData.scheduledStartTime = data.scheduledStartTime;
        if (data?.scheduledEndTime) updateData.scheduledEndTime = data.scheduledEndTime;
        if (data?.subcontractorId) updateData.subcontractorId = data.subcontractorId;

        // Validations can be added here (e.g. check if user is braider/sub for this job)

        await prisma.job.update({
            where: { id: jobId },
            data: updateData,
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Update job error:', error);
        return { error: 'Failed to update job' };
    }
}

export async function addNote(jobId: string, content: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return { error: 'User not found' };

        await prisma.note.create({
            data: {
                jobId,
                authorId: user.id,
                content,
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Add note error:', error);
        return { error: 'Failed to add note' };
    }
}

export async function markJobCompleted(jobId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'completed' },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Mark completed error:', error);
        return { error: 'Failed to mark job as completed' };
    }
}

export async function markJobPaid(jobId: string, paymentPlatform: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.job.update({
            where: { id: jobId },
            data: {
                paidAt: new Date(),
                paymentPlatform,
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Mark paid error:', error);
        return { error: 'Failed to mark job as paid' };
    }
}

export async function getBraiderData(braiderId: string) {
    try {
        console.log(new Date());
        const braider = await prisma.user.findUnique({
            where: { id: braiderId },
            include: {
                shows: {
                    include: { days: true },
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
    const session = await getServerSession(authOptions);
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
    const session = await getServerSession(authOptions);
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
    const session = await getServerSession(authOptions);
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
