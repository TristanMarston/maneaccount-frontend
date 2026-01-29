import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe-init';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const { password, name, role } = body;

    if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });
    if (!password) return NextResponse.json({ error: 'password_required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
    if (!role) return NextResponse.json({ error: 'role_required' }, { status: 400 });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return NextResponse.json({ error: 'existing_user' }, { status: 400 });
    }

    const hashedPassword = await hash(password, 10);

    const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role },
    });

    if (role === 'braider' && user) {
        const customer = await stripe.customers.create({
            email: email,
            name: name || undefined,
            metadata: {
                userId: user.id,
                role: 'braider',
            },
        });

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const updateData: any = {};
        updateData.stripeCustomerId = customer.id;
        updateData.trialEndsAt = trialEndDate;
        updateData.subscriptionStatus = 'trialing';
        updateData.subscriptionTier = 'enterprise';

        await prisma.user.update({
            where: { id: user.id },
            data: updateData,
        });
    }

    return NextResponse.json({ user });
}
