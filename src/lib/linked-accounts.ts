import { Role, SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe-init';

export const LINKABLE_ROLES: Role[] = ['braider', 'subcontractor'];

export function isLinkableRole(role: string | null | undefined): role is 'braider' | 'subcontractor' {
    return role === 'braider' || role === 'subcontractor';
}

export function getCounterpartRole(role: string | null | undefined): 'braider' | 'subcontractor' | null {
    if (role === 'braider') return 'subcontractor';
    if (role === 'subcontractor') return 'braider';
    return null;
}

export async function getCurrentUserById(userId: string) {
    return (prisma.user as any).findUnique({
        where: { id: userId },
    });
}

export async function getLinkedAccountGroupForUser(userId: string) {
    const user = await (prisma.user as any).findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            linkedAccountGroupId: true,
            linkedAccountGroup: {
                include: {
                    accounts: {
                        orderBy: { createdAt: 'asc' },
                    },
                },
            },
        },
    });

    return user;
}

export async function getLinkedAccountsForUser(userId: string) {
    const user: any = await getLinkedAccountGroupForUser(userId);
    return user?.linkedAccountGroup?.accounts ?? [];
}

export async function ensureLinkedAccountGroup(userId: string) {
    const user: any = await (prisma.user as any).findUnique({
        where: { id: userId },
        select: { id: true, linkedAccountGroupId: true },
    });

    if (!user) {
        throw new Error('User not found');
    }

    if (user.linkedAccountGroupId) {
        return user.linkedAccountGroupId;
    }

    const group = await (prisma as any).linkedAccountGroup.create({
        data: {
            accounts: {
                connect: { id: userId },
            },
        },
    });

    return group.id;
}

export async function syncSharedFieldsAcrossLinkedAccounts(
    userId: string,
    data: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        publicID?: string | null;
        emailVerified?: Date | null;
    },
) {
    const groupId = await ensureLinkedAccountGroup(userId);

    const sharedUpdateData: Record<string, unknown> = {};
    if (data.name !== undefined) sharedUpdateData.name = data.name;
    if (data.email !== undefined) sharedUpdateData.email = data.email;
    if (data.image !== undefined) sharedUpdateData.image = data.image;
    if (data.publicID !== undefined) sharedUpdateData.publicID = data.publicID;
    if (data.emailVerified !== undefined) sharedUpdateData.emailVerified = data.emailVerified;

    if (Object.keys(sharedUpdateData).length === 0) {
        return;
    }

    await (prisma.user as any).updateMany({
        where: { linkedAccountGroupId: groupId },
        data: sharedUpdateData,
    });
}

export async function createLinkedRoleAccountForUser(userId: string) {
    const baseUser: any = await (prisma.user as any).findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            name: true,
            email: true,
            image: true,
            publicID: true,
            password: true,
            emailVerified: true,
            linkedAccountGroupId: true,
        },
    });

    if (!baseUser) {
        return { error: 'User not found' as const };
    }

    if (!isLinkableRole(baseUser.role)) {
        return { error: 'Only braiders and subcontractors can create linked accounts.' as const };
    }

    const targetRole = getCounterpartRole(baseUser.role);
    if (!targetRole) {
        return { error: 'Unsupported role' as const };
    }

    const groupId = await ensureLinkedAccountGroup(baseUser.id);

    const existingCounterpart = await (prisma.user as any).findFirst({
        where: {
            linkedAccountGroupId: groupId,
            role: targetRole,
        },
        select: { id: true, role: true },
    });

    if (existingCounterpart) {
        return { error: `A linked ${targetRole} account already exists.`, linkedAccountId: existingCounterpart.id as string };
    }

    const createData: Record<string, unknown> = {
        role: targetRole,
        name: baseUser.name,
        email: baseUser.email,
        image: baseUser.image,
        publicID: baseUser.publicID,
        password: baseUser.password,
        emailVerified: baseUser.emailVerified,
        linkedAccountGroup: {
            connect: { id: groupId },
        },
    };

    if (targetRole === 'braider') {
        const customer = await stripe.customers.create({
            email: baseUser.email || undefined,
            name: baseUser.name || undefined,
            metadata: {
                sourceUserId: baseUser.id,
                role: 'braider',
            },
        });

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        createData.stripeCustomerId = customer.id;
        createData.subscriptionStatus = SubscriptionStatus.trialing;
        createData.subscriptionTier = SubscriptionTier.starter;
        createData.trialEndsAt = trialEndDate;
    }

    const linkedAccount = await (prisma.user as any).create({
        data: createData,
        select: {
            id: true,
            role: true,
            name: true,
            email: true,
            image: true,
        },
    });

    return { success: true as const, linkedAccount };
}

export async function canSwitchToLinkedAccount(currentUserId: string, targetUserId: string) {
    const [currentUser, targetUser] = await Promise.all([
        (prisma.user as any).findUnique({
            where: { id: currentUserId },
            select: { id: true, linkedAccountGroupId: true },
        }),
        (prisma.user as any).findUnique({
            where: { id: targetUserId },
            select: { id: true, linkedAccountGroupId: true },
        }),
    ]);

    return !!currentUser && !!targetUser && !!currentUser.linkedAccountGroupId && currentUser.linkedAccountGroupId === targetUser.linkedAccountGroupId;
}
