'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe-init';
import { hash } from 'bcryptjs';
import {
    createLinkedRoleAccountForUser,
    getCounterpartRole,
    getLinkedAccountsForUser,
    getCurrentUserById,
    isLinkableRole,
    syncSharedFieldsAcrossLinkedAccounts,
} from '@/lib/linked-accounts';

export async function checkPublicIDAvailability(publicID: string) {
    const session = await auth();
    if (!session?.user?.id) return false;

    const sanitizedID = publicID.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (sanitizedID.length < 3) return false;

    const existingUsers: any[] = await (prisma.user as any).findMany({
        where: { publicID: sanitizedID },
        select: { id: true, linkedAccountGroupId: true },
    });

    if (existingUsers.length === 0) return true;

    const currentUser: any = await (prisma.user as any).findUnique({
        where: { id: session.user.id },
        select: { id: true, linkedAccountGroupId: true },
    });

    if (!currentUser) return false;

    return existingUsers.every((existingUser) => {
        if (existingUser.id === currentUser.id) return true;
        return !!currentUser.linkedAccountGroupId && currentUser.linkedAccountGroupId === existingUser.linkedAccountGroupId;
    });
}

export async function updateProfile(formData: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

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
    const autoSendInvoiceTo = formData.autoSendInvoiceTo as 'client' | 'barn' | 'both' | null;

    if (!name && !email && !publicID && !imageFile && !phoneNumber && !venmo && !zelle && venmoEnabled === null && !allowedNotifications && !thanksMessage && !autoSendInvoiceTo)
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
    if (autoSendInvoiceTo) updateData.autoSendInvoiceTo = autoSendInvoiceTo;

    if (publicID) {
        const sanitizedID = publicID.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isAvailable = await checkPublicIDAvailability(sanitizedID);
        if (!isAvailable) return { error: 'User ID is already taken' };
        updateData.publicID = sanitizedID;
    }

    try {
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!currentUser) return { error: 'User not found' };

        if (imageFile && imageFile.size > 0) {
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

            if (currentUser.image && currentUser.image.length > 0 && currentUser.image.indexOf('supabase.co') !== -1) {
                const split: string[] = currentUser.image.split('/');
                const root = split[split.length - 1];
                await supabaseAdmin.storage.from('avatars').remove([root]);
            }

            const filename = `${session.user.id}-${Date.now()}.jpg`;
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

        const sharedUpdateData: Record<string, unknown> = {};
        if (updateData.name !== undefined) sharedUpdateData.name = updateData.name;
        if (updateData.email !== undefined) sharedUpdateData.email = updateData.email;
        if (updateData.publicID !== undefined) sharedUpdateData.publicID = updateData.publicID;
        if (updateData.image !== undefined) sharedUpdateData.image = updateData.image;
        if (updateData.emailVerified !== undefined) sharedUpdateData.emailVerified = updateData.emailVerified;

        if (Object.keys(sharedUpdateData).length > 0) {
            await syncSharedFieldsAcrossLinkedAccounts(session.user.id, sharedUpdateData);
        }

        const accountSpecificUpdateData = { ...updateData };
        delete accountSpecificUpdateData.name;
        delete accountSpecificUpdateData.email;
        delete accountSpecificUpdateData.publicID;
        delete accountSpecificUpdateData.image;
        delete accountSpecificUpdateData.emailVerified;

        if (Object.keys(accountSpecificUpdateData).length > 0) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: accountSpecificUpdateData,
            });
        }

        revalidatePath('/dashboard');
        return { success: true, image: updateData.image && updateData.image.length > 0 ? updateData.image : undefined };
    } catch (error) {
        console.error(error);

        let emailAlreadyExists = false;
        if (formData.email) {
            const existingUsers: any[] = await (prisma.user as any).findMany({
                where: { email: formData.email },
                select: { id: true, linkedAccountGroupId: true },
            });
            const currentUser: any = await (prisma.user as any).findUnique({
                where: { id: session.user.id },
                select: { id: true, linkedAccountGroupId: true },
            });
            emailAlreadyExists = existingUsers.some(
                (existingUser) =>
                    existingUser.id !== session.user.id &&
                    (!currentUser?.linkedAccountGroupId || existingUser.linkedAccountGroupId !== currentUser.linkedAccountGroupId),
            );
        }

        return { error: emailAlreadyExists ? 'Email already taken' : 'Failed to update profile' };
    }
}

export async function getUserSettings() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
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
            autoSendInvoiceTo: true,
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

    if (!user) return null;

    const linkedAccounts = await getLinkedAccountsForUser(session.user.id);

    return {
        ...user,
        linkedAccounts: linkedAccounts
            .filter((account: any) => account.id !== session.user.id)
            .map((account) => ({
                id: account.id,
                role: account.role,
                name: account.name,
                email: account.email,
                image: account.image,
            })),
    };
}

export async function deleteAccount() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
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
            where: { id: session.user.id },
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
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const result = await createLinkedRoleAccountForUser(session.user.id);
    if ('error' in result) return { error: result.error };

    revalidatePath('/dashboard');
    return { success: true, linkedAccount: result.linkedAccount };
}

export async function changeThanksMessage(message: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.user.update({ where: { id: session.user.id }, data: { thanksMessage: message } });

        revalidatePath('/dashboard');
        return { success: true, message };
    } catch (error) {
        console.error('Rewrite thanks message error:', error);
        return { error: 'Failed to set thank-you message' };
    }
}

export async function switchToEmailPassword(password: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const hashedPassword = await hash(password, 10);
        const linkedAccounts = await getLinkedAccountsForUser(session.user.id);
        const ids = linkedAccounts.length > 0 ? linkedAccounts.map((account) => account.id) : [session.user.id];

        await prisma.$transaction([
            prisma.user.updateMany({
                where: { id: { in: ids } },
                data: { password: hashedPassword },
            }),
            prisma.account.deleteMany({
                where: {
                    userId: { in: ids },
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
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                accounts: {
                    where: { provider: 'google' },
                },
            },
        });

        if (user && user.accounts.length > 1) {
            // Sort by id descending (cuid encodes timestamp so it works well enough)
            const sortedAccounts = user.accounts.sort((a: any, b: any) => b.id.localeCompare(a.id));
            const accountsToDelete = sortedAccounts.slice(1).map((a: any) => a.id);

            await prisma.account.deleteMany({
                where: {
                    id: { in: accountsToDelete },
                },
            });
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to cleanup google accounts:', error);
        return { error: 'Failed to cleanup google accounts' };
    }
}

export async function getLinkedRoleAccounts() {
    const session = await auth();
    if (!session?.user?.id) return [];

    const currentUser = await getCurrentUserById(session.user.id);
    if (!currentUser || !isLinkableRole(currentUser.role)) return [];

    const accounts = await getLinkedAccountsForUser(session.user.id);

    return accounts
        .filter((account: any) => account.id !== session.user.id && isLinkableRole(account.role))
        .map((account) => ({
            id: account.id,
            role: account.role as 'braider' | 'subcontractor',
            name: account.name,
            email: account.email,
            image: account.image,
        }));
}

export async function getLinkedRoleAccountStatus() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const currentUser = await getCurrentUserById(session.user.id);
    if (!currentUser || !isLinkableRole(currentUser.role)) {
        return {
            currentRole: currentUser?.role ?? null,
            canCreateLinkedAccount: false,
            counterpartRole: null,
            linkedAccounts: [],
        };
    }

    const linkedAccounts = await getLinkedRoleAccounts();

    return {
        currentRole: currentUser.role,
        canCreateLinkedAccount: linkedAccounts.length === 0,
        counterpartRole: getCounterpartRole(currentUser.role),
        linkedAccounts,
    };
}
