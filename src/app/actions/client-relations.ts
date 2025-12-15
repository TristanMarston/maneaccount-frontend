'use server';

import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';
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

export async function getRelations(email: string) {
    if (!email) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                sentConnections: { include: { receiver: true } },
                receivedConnections: { include: { sender: true } }
            }
        });

        if (!user) return [];

        const targetRole = user.role === 'client' ? 'braider' : 'client'; 

        // 1. Sent Connections (I invited them)
        const sent = user.sentConnections
            .filter(c => c.status === 'accepted' && c.receiver.role === targetRole)
            .map(c => ({ ...c.receiver, connectionID: c.id, joinedAt: c.createdAt }));
            
        // 2. Received Connections (They invited me)
        const received = user.receivedConnections
            .filter(c => c.status === 'accepted' && c.sender.role === targetRole)
            .map(c => ({ ...c.sender, connectionID: c.id, joinedAt: c.createdAt }));

        return [...sent, ...received];
    } catch (error) {
        console.error('Failed to fetch relations:', error);
        return [];
    }
}

export async function getPendingRelations(email: string) {
    if (!email) return { incoming: [], outgoing: [] };

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                receivedConnections: {
                    where: { status: 'pending' },
                    include: { sender: true }
                },
                sentConnections: {
                    where: { status: 'pending' },
                    include: { receiver: true }
                }
            }
        });

        if (!user) return { incoming: [], outgoing: [] };

        const targetRole = user.role === 'client' ? 'braider' : 'client';

        // Filter pending requests to only show those matching the desired relationship type
        // e.g. If I'm a Braider, don't show pending Subcontractor requests here (those go to TeamView)
        
        const incoming = user.receivedConnections
            .filter(c => c.sender.role === targetRole)
            .map(c => ({
                ...c.sender,
                connectionID: c.id,
                sentAt: c.createdAt
            }));

        const outgoing = user.sentConnections
            .filter(c => c.receiver.role === targetRole)
            .map(c => ({
                ...c.receiver,
                connectionID: c.id,
                sentAt: c.createdAt
            }));

        return { incoming, outgoing };
    } catch (error) {
        console.error('Failed to fetch pending relations:', error);
        return { incoming: [], outgoing: [] };
    }
}

export async function inviteRelation(publicID: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const sender = await prisma.user.findUnique({
            where: { email: session.user.email }
        });
        if (!sender) return { error: 'User not found' };

        const receiver = await prisma.user.findUnique({
            where: { publicID: publicID.toLowerCase() }
        });
        if (!receiver) return { error: 'User not found with that ID' };

        if (sender.id === receiver.id) return { error: 'Cannot invite yourself' };

        const validBraiderClient = 
            (sender.role === 'braider' && receiver.role === 'client') ||
            (sender.role === 'client' && receiver.role === 'braider');
            
        if (!validBraiderClient) {
            return { error: `You cannot add a ${receiver.role.toLowerCase()} here.` };
        }

        const existing = await prisma.connection.findFirst({
            where: {
                OR: [
                    { senderId: sender.id, receiverId: receiver.id },
                    { senderId: receiver.id, receiverId: sender.id }
                ]
            }
        });

        if (existing) {
            return { error: existing.status === 'pending' ? 'Invitation already pending' : 'User already connected' };
        }

        await prisma.connection.create({
            data: {
                senderId: sender.id,
                receiverId: receiver.id,
                status: 'pending'
            }
        });

        revalidatePath('/dashboard');
        return { success: true, message: `Invitation sent to ${receiver.name}` };

    } catch (error) {
        console.error('Invite error:', error);
        return { error: 'Failed to send invitation' };
    }
}

export async function removeRelation(connectionId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.connection.delete({
            where: { id: connectionId }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to remove connection' };
    }
}

export async function acceptRelationRequest(connectionId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        await prisma.connection.update({
            where: { id: connectionId },
            data: { status: 'accepted' }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to accept request' };
    }
}

export async function getRelationByPublicID(publicID: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { publicID: publicID.toLowerCase() },
            select: {
                name: true,
                image: true,
                role: true,
                publicID: true
            }
        });
        
        if (!user) return { error: 'User not found' };
        return { user };
    } catch (error) {
        return { error: 'Failed to fetch user' };
    }
}