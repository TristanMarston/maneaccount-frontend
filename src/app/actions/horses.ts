'use server';

import { Gender } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export async function getHorses(email: string) {
    if (!email) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { horses: true },
        });
        return user?.horses || [];
    } catch (error) {
        console.error('Failed to fetch horses:', error);
        return [];
    }
}

export async function addHorse(formData: any) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return { error: 'Unauthorized' };
    }

    const showName = formData.showName as string;
    const barnName = formData.barnName as string;
    const gender = formData.gender as string;
    const color = formData.color as string;
    const profileImage = formData.profileImage as File;
    const notes = formData.notes as string;

    if (!showName || !barnName) {
        return { error: 'Missing required fields' };
    }

    try {
        let profileImageUrl = '';

        if (profileImage && profileImage.size > 0) {
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

            const filename = `${session.user.email}-${Date.now()}.jpg`;

            const arrayBuffer = await profileImage.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);

            const { error: uploadError } = await supabaseAdmin.storage.from('horse-photos').upload(filename, buffer, {
                contentType: profileImage.type || 'image/jpeg',
                upsert: true,
            });

            if (uploadError) {
                console.error('Supabase Upload Error:', uploadError);
                throw new Error('Failed to upload image');
            }

            const {
                data: { publicUrl },
            } = supabaseAdmin.storage.from('horse-photos').getPublicUrl(filename);

            profileImageUrl = publicUrl;
        }

        await prisma.horse.create({
            data: {
                user: { connect: { email: session.user.email } },
                showName,
                barnName,
                gender: gender ? (gender as Gender) : null,
                color: color || '',
                notes: notes || '',
                profileImage: profileImageUrl || '',
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to add horse:', error);
        return { error: 'Failed to add horse' };
    }
}

export async function editHorse(data: any, horseId: string) {
    const session = await getServerSession(authOptions);

    if (!data.showName && !data.barnName && !data.gender && !data.color && !data.notes && !data.profileImage) return { error: 'Send a field to update' };

    const profileImage = data.profileImage;

    if (!session || !session.user?.email) {
        return { error: 'Unauthorized' };
    }

    try {
        const horse = await prisma.horse.findUnique({
            where: { id: horseId },
            include: { user: true },
        });

        if (!horse || horse.user.email !== session.user.email) {
            return { error: 'Unauthorized' };
        }

        if (profileImage && profileImage.size > 0) {
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            if (horse.profileImage && horse.profileImage.length > 0) {
                const split: string[] = horse.profileImage.split('/');
                const root = split[split.length - 1];
                await supabaseAdmin.storage.from('horse-photos').remove([root]);
            }

            const filename = `${session.user.email}-${Date.now()}.jpg`;

            const arrayBuffer = await profileImage.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);

            const { error: uploadError } = await supabaseAdmin.storage.from('horse-photos').upload(filename, buffer, {
                contentType: profileImage.type || 'image/jpeg',
                upsert: true,
            });

            if (uploadError) {
                console.error('Supabase Upload Error:', uploadError);
                throw new Error('Failed to upload image');
            }

            const {
                data: { publicUrl },
            } = supabaseAdmin.storage.from('horse-photos').getPublicUrl(filename);

            data.profileImage = publicUrl;
        }

        await prisma.horse.update({
            where: { id: horseId },
            data,
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to edit horse' };
    }
}

export async function deleteHorse(horseId: string) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return { error: 'Unauthorized' };
    }

    try {
        const horse = await prisma.horse.findUnique({
            where: { id: horseId },
            include: { user: true },
        });

        if (!horse || horse.user.email !== session.user.email) {
            return { error: 'Unauthorized' };
        }

        await prisma.horse.delete({
            where: { id: horseId },
        });

        if (horse.profileImage && horse.profileImage.length > 0) {
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

            const split: string[] = horse.profileImage.split('/');
            const root = split[split.length - 1];
            await supabaseAdmin.storage.from('horse-photos').remove([root]);
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to delete horse' };
    }
}
