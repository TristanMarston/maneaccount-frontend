'use server';

import { randomBytes } from 'crypto';
import { auth } from '@/lib/auth';
import { sendNotificationEmail, sendVerificationCode } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export async function generateVerificationToken(email: string) {
    // Generate 6 digit code (100000 to 999999)
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration to 15 minutes
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

        await sendVerificationCode({
            to: session.user.email,
            code: token,
        });

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

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
        return { error: 'Code has expired!' };
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: existingToken.identifier },
    });

    if (!existingUser) {
        return { error: 'Email does not exist!' };
    }

    await prisma.user.update({
        where: { id: existingUser.id },
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
