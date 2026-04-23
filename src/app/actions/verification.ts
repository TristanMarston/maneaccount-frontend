'use server';

import { randomBytes } from 'crypto';
import { auth } from '@/lib/auth';
import { sendVerificationCode } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

export async function generateVerificationToken(email: string) {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(new Date().getTime() + 15 * 60 * 1000);

    await prisma.verificationToken.deleteMany({
        where: { identifier: email },
    });

    const verificationToken = await prisma.verificationToken.create({
        data: {
            identifier: email,
            token,
            expires,
        },
    });

    return verificationToken.token;
}

export async function requestVerificationEmail() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const token = await generateVerificationToken(session.user.email);

        const result = await sendVerificationCode({
            to: session.user.email,
            code: token,
        });

        if (!result.success) {
            return { error: typeof result.error === 'string' ? result.error : 'Failed to send verification email' };
        }

        return { success: true };
    } catch (error) {
        console.error('Verification email error:', error);
        return { error: 'Failed to send verification email' };
    }
}

export async function verifyToken(token: string) {
    const existingToken = await prisma.verificationToken.findUnique({
        where: { token },
    });

    if (!existingToken) {
        return { error: 'Invalid code!' };
    }

    const hasExpired = new Date(existingToken.expires).getTime() < new Date().getTime();

    if (hasExpired) {
        return { error: 'Code has expired!' };
    }

    const existingUsers = await prisma.user.findMany({
        where: { email: existingToken.identifier },
        select: { id: true, email: true },
        take: 2,
    });
    if (existingUsers.length === 0) return { error: 'No accounts found with that email.' };

    await prisma.user.updateMany({
        where: { email: { in: existingUsers.map((u) => u.email) } },
        data: {
            emailVerified: new Date(),
            email: existingToken.identifier,
        },
    });

    await prisma.verificationToken.delete({
        where: { token },
    });

    return { success: 'Email verified!' };
}

export async function requestPasswordReset(email: string) {
    if (!email) return { error: 'Email is required' };

    try {
        const existingUsers = await prisma.user.findMany({
            where: { email: email.toLowerCase() },
            select: { id: true, password: true },
            take: 2,
        });
        if (existingUsers.length === 0) return { error: 'No accounts found with that email address.' }
        const existingUser = existingUsers[0];

        if (!existingUser.password) {
            return { error: 'User signed in with google' };
        }

        const token = await generateVerificationToken(email.toLowerCase());

        const result = await sendVerificationCode({
            to: email.toLowerCase(),
            code: token,
        });

        if (!result.success) {
            return { error: typeof result.error === 'string' ? result.error : 'Failed to send reset code' };
        }

        return { success: true };
    } catch (error) {
        console.error('Password reset request error:', error);
        return { error: 'Failed to send reset code' };
    }
}

export async function verifyResetCode(email: string, token: string) {
    if (!email || !token) return { error: 'Email and code are required' };

    const existingToken = await prisma.verificationToken.findFirst({
        where: {
            identifier: email.toLowerCase(),
            token,
        },
    });

    if (!existingToken) {
        return { error: 'Invalid code!' };
    }

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
        return { error: 'Code has expired!' };
    }

    return { success: true };
}

export async function resetPassword(email: string, token: string, password: string) {
    if (!email || !token || !password) return { error: 'Missing required fields' };

    try {
        const existingToken = await prisma.verificationToken.findFirst({
            where: {
                identifier: email.toLowerCase(),
                token,
            },
        });

        if (!existingToken) {
            return { error: 'Invalid or expired code' };
        }

        const hasExpired = new Date(existingToken.expires) < new Date();
        if (hasExpired) {
            return { error: 'Code has expired' };
        }

        const hashedPassword = await hash(password, 10);

        await prisma.user.updateMany({
            where: { email: email.toLowerCase() },
            data: { password: hashedPassword },
        });

        await prisma.verificationToken.deleteMany({
            where: { identifier: email.toLowerCase() },
        });

        return { success: 'Password reset successfully' };
    } catch (error) {
        console.error('Reset password error:', error);
        return { error: 'Failed to reset password' };
    }
}
