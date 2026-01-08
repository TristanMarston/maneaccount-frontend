import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const { email, password, name, role } = await req.json();

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

    return NextResponse.json({ user });
}
