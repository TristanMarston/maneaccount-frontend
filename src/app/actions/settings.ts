'use server';

import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        }),
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function checkPublicIDAvailability(publicID: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return false;

    const sanitizedID = publicID.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (sanitizedID.length < 3) return false;

    const existingUser = await prisma.user.findUnique({
        where: { publicID: sanitizedID },
    });

    if (!existingUser) return true;
    return existingUser.email === session.user.email;
}

export async function updateProfile(formData: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    const name = formData.name as string | null;
    const publicID = formData.publicID as string | null;
    const imageFile = formData.image as File | null;
    const phoneNumber = formData.phoneNumber as string | null;

    if (!name && !publicID && !imageFile && !phoneNumber) return { error: 'Name, User ID, or Profile Image is required' };

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber.replace(/\D/g, '');
    if (publicID) {
        const sanitizedID = publicID.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isAvailable = await checkPublicIDAvailability(sanitizedID);
        if (!isAvailable) return { error: 'User ID is already taken' };
        updateData.publicID = sanitizedID;
    }

    try {
        if (imageFile && imageFile.size > 0) {
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
            });

            if (user && user.image && user.image.length > 0 && user.image.indexOf('supabase.co') !== -1) {
                const split: string[] = user.image.split('/');
                const root = split[split.length - 1];
                await supabaseAdmin.storage.from('avatars').remove([root]);
            }

            const filename = `${session.user.email}-${Date.now()}.jpg`;
            const arrayBuffer = await imageFile.arrayBuffer();
            const { error: uploadError } = await supabaseAdmin.storage.from('avatars').upload(filename, arrayBuffer, {
                contentType: imageFile.type || 'image/jpeg',
                upsert: true,
            });

            if (uploadError) throw new Error('Image upload failed');

            const {
                data: { publicUrl },
            } = supabaseAdmin.storage.from('avatars').getPublicUrl(filename);

            updateData.image = publicUrl;
        }

        await prisma.user.update({
            where: { email: session.user.email },
            data: updateData,
        });

        revalidatePath('/dashboard');
        return { success: true, image: updateData.image && updateData.image.length > 0 ? updateData.image : undefined };
    } catch (error) {
        console.error(error);
        return { error: 'Failed to update profile' };
    }
}

export async function getUserSettings() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

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
        },
    });
}

export async function deleteAccount() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) return { error: 'User not found' };

        if (user.image && user.image.includes(process.env.NEXT_PUBLIC_SUPABASE_URL!)) {
            try {
                const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

                const split: string[] = user.image.split('/');
                const root = split[split.length - 1];
                await supabaseAdmin.storage.from('avatars').remove([root]);
            } catch (storageError) {
                console.error('Error cleaning up user image:', storageError);
            }
        }

        await prisma.user.delete({
            where: { email: session.user.email },
        });

        return { success: true };
    } catch (error) {
        console.error('Delete account error:', error);
        return { error: 'Failed to delete account' };
    }
}

export async function deleteAccountByID(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session?.user?.role !== 'admin') return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) return { error: 'User not found' };

        if (user.image && user.image.includes(process.env.NEXT_PUBLIC_SUPABASE_URL!)) {
            try {
                const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

                const split: string[] = user.image.split('/');
                const root = split[split.length - 1];
                await supabaseAdmin.storage.from('avatars').remove([root]);
            } catch (storageError) {
                console.error('Error cleaning up user image:', storageError);
            }
        }

        await prisma.user.delete({
            where: { id },
        });

        return { success: true };
    } catch (error) {
        console.error('Delete account error:', error);
        return { error: 'Failed to delete account' };
    }
}

export async function switchAccountRole() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, role: true },
        });

        if (!user) return { error: 'User not found' };

        if (user.role === 'braider') {
            await prisma.connection.deleteMany({
                where: {
                    OR: [{ senderId: user.id }, { receiverId: user.id }],
                },
            });

            await prisma.service.deleteMany({
                where: { userId: user.id },
            });

            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'subcontractor' },
            });

            revalidatePath('/dashboard');
            return { success: true, newRole: 'subcontractor' };
        } else if (user.role === 'subcontractor') {
            await prisma.connection.deleteMany({
                where: {
                    OR: [{ senderId: user.id }, { receiverId: user.id }],
                },
            });

            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'braider' },
            });

            revalidatePath('/dashboard');
            return { success: true, newRole: 'braider' };
        }

        return { error: 'Invalid role switch. Only Braiders and Subcontractors can switch.' };
    } catch (error) {
        console.error('Switch role error:', error);
        return { error: 'Failed to switch role' };
    }
}
