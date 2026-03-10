'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe-init';
import { hash } from 'bcryptjs';

export async function checkPublicIDAvailability(publicID: string) {
    const session = await auth();
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
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    const name = formData.name as string | null;
    const email = formData.email as string | null;
    const publicID = formData.publicID as string | null;
    const imageFile = formData.image as File | null;
    const phoneNumber = formData.phoneNumber as string | null;
    const venmo = formData.venmo as string | null;
    const zelle = formData.zelle as 'email' | 'phone' | 'disabled' | null;
    const venmoEnabled = formData.venmoEnabled as boolean | null;
    const allowedNotifications = formData.allowedNotifications as any[] | null;
    const thanksMessage = formData.thanksMessage as string | null;

    if (!name && !email && !publicID && !imageFile && !phoneNumber && !venmo && !zelle && venmoEnabled === null && !allowedNotifications && !thanksMessage)
        return { error: 'Update at least one field' };

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) {
        updateData.email = email;
        updateData.emailVerified = null;
    }
    if (phoneNumber) updateData.phoneNumber = phoneNumber.replace(/\D/g, '');
    if (venmo !== null) updateData.venmo = venmo;
    if (zelle !== null) updateData.zelle = zelle;
    if (venmoEnabled !== null) updateData.venmoEnabled = venmoEnabled;
    if (thanksMessage !== null) updateData.thanksMessage = thanksMessage;
    if (allowedNotifications) updateData.allowedNotifications = allowedNotifications;

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

        let emailAlreadyExists = false;
        if (formData.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email: formData.email },
            });
            if (existingUser && existingUser.email !== session.user.email) emailAlreadyExists = true;
        }

        return { error: emailAlreadyExists ? 'Email already taken' : 'Failed to update profile' };
    }
}

export async function getUserSettings() {
    const session = await auth();
    if (!session?.user?.email) return null;

    return await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            name: true,
            password: true,
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
            subscriptionStatus: true,
            subscriptionTier: true,
            currentPeriodEnd: true,
            trialEndsAt: true,
            accounts: {
                where: { provider: 'google' },
                select: { id: true },
            },
        },
    });
}

export async function deleteAccount() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) return { error: 'User not found' };

        if (user.stripeCustomerId) {
            try {
                await stripe.customers.del(user.stripeCustomerId);
            } catch (stripeError) {
                console.error('Error deleting Stripe customer:', stripeError);
            }
        }

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
    const session = await auth();
    if (!session?.user?.email || session?.user?.role !== 'admin') return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) return { error: 'User not found' };

        if (user.stripeCustomerId) {
            try {
                await stripe.customers.del(user.stripeCustomerId);
            } catch (stripeError) {
                console.error('Error deleting Stripe customer:', stripeError);
            }
        }

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
    const session = await auth();
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

export async function changeThanksMessage(message: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.user.update({ where: { email: session.user.email }, data: { thanksMessage: message } });

        revalidatePath('/dashboard');
        return { success: true, message };
    } catch (error) {
        console.error('Rewrite thanks message error:', error);
        return { error: 'Failed to set thank-you message' };
    }
}

export async function switchToEmailPassword(password: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const hashedPassword = await hash(password, 10);
        
        await prisma.$transaction([
            prisma.user.update({
                where: { email: session.user.email },
                data: { password: hashedPassword },
            }),
            prisma.account.deleteMany({
                where: {
                    user: { email: session.user.email },
                    provider: 'google',
                },
            }),
        ]);

        return { success: true };
    } catch (error) {
        console.error('Failed to switch to email/password:', error);
        return { error: 'Failed to switch to email/password' };
    }
}

export async function cleanupExtraGoogleAccounts() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                accounts: {
                    where: { provider: 'google' }
                }
            }
        });

        if (user && user.accounts.length > 1) {
            // Sort by id descending (cuid encodes timestamp so it works well enough)
            const sortedAccounts = user.accounts.sort((a, b) => b.id.localeCompare(a.id));
            const accountsToDelete = sortedAccounts.slice(1).map(a => a.id);

            await prisma.account.deleteMany({
                where: {
                    id: { in: accountsToDelete }
                }
            });
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to cleanup google accounts:', error);
        return { error: 'Failed to cleanup google accounts' };
    }
}
