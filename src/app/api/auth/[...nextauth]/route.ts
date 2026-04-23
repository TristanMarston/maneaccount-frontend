import NextAuth, { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcryptjs from 'bcryptjs';
import { cookies } from 'next/headers';
import { generateUniquePublicID } from '@/app/actions/generatePublicID';
import { establishConnection } from '@/app/actions/join';
import { prisma } from '@/lib/prisma';
import { canSwitchToLinkedAccount } from '@/lib/linked-accounts';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { stripe } from '@/lib/stripe-init';

export const authOptions: AuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    scope: 'openid email profile https://www.googleapis.com/auth/calendar.app.created',
                    prompt: 'select_account',
                    access_type: 'offline',
                    response_type: 'code',
                },
            },
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) {
                    throw new Error('missing_fields');
                }

                const email = credentials.email.trim().toLowerCase();
                const users = await prisma.user.findMany({
                    where: { email },
                    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
                });

                if (users.length === 0) {
                    throw new Error('no_user');
                }

                const matchedUsers: any[] = [];
                for (const candidate of users) {
                    if (!candidate.password) continue;
                    const isValid = await bcryptjs.compare(credentials.password, candidate.password);
                    if (isValid) matchedUsers.push(candidate);
                }

                if (matchedUsers.length === 0) {
                    throw new Error('wrong_password');
                }

                const user = matchedUsers.find((candidate) => candidate.role === 'braider') ?? matchedUsers[0];

                if (!user.password) {
                    throw new Error('no_password_set');
                }

                return user;
            },
        }),
    ],
    events: {
        async signIn({ user }) {
            if (user.email) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: {
                            id: true,
                            role: true,
                            publicID: true,
                            name: true,
                            email: true,
                        },
                    });

                    if (dbUser && !dbUser.publicID) {
                        const newID = await generateUniquePublicID(dbUser.name, dbUser.email);

                        await prisma.user.update({
                            where: { id: user.id },
                            data: { publicID: newID },
                        });
                    }
                } catch (error) {
                    console.error('Error generating public ID:', error);
                }

                const cookieStore = await cookies();
                const joinCookie = cookieStore.get('join_request_user');
                const targetPublicID = joinCookie?.value;

                if (targetPublicID && user.id) establishConnection(user.id);
            }
        },
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google') {
                try {
                    const cookieStore = await cookies();
                    const intent = cookieStore.get('auth_intent')?.value;
                    const linkTargetEmail = cookieStore.get('link_target_email')?.value;

                    if (intent === 'link' && linkTargetEmail && profile?.email) {
                        const existingUser = await prisma.user.findFirst({
                            where: { email: linkTargetEmail },
                        });

                        if (existingUser && profile.email.toLowerCase() !== existingUser.email?.toLowerCase()) {
                            const emailTaken = await prisma.user.findFirst({
                                where: { email: profile.email.toLowerCase() },
                            });

                            if (!emailTaken || emailTaken.id === existingUser.id) {
                                const updateData: any = { email: profile.email.toLowerCase() };
                                if (profile.name) updateData.name = profile.name;
                                if ((profile as any).picture) updateData.image = (profile as any).picture;

                                await prisma.user.update({
                                    where: { id: existingUser.id },
                                    data: updateData,
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error handling Google link intent:', error);
                }
                if (account.refresh_token && user.email) {
                    try {
                        const existingAccount = await prisma.account.findFirst({
                            where: {
                                provider: 'google',
                                user: { email: user.email },
                            },
                        });

                        if (existingAccount && !existingAccount.refresh_token) {
                            await prisma.account.update({
                                where: { id: existingAccount.id },
                                data: { refresh_token: account.refresh_token },
                            });
                        }
                    } catch (err) {
                        console.error('Error updating refresh token:', err);
                    }
                }

                try {
                    const cookieStore = await cookies();
                    const intent = cookieStore.get('auth_intent')?.value;

                    if (intent === 'signin') {
                        const existingUser = await prisma.user.findUnique({
                            where: { id: user.id },
                        });

                        if (!existingUser) {
                            return '/login?mode=signup&error=AccountNotFound';
                        }
                    }
                } catch (error) {
                    console.error('Error during google sign-in check:', error);
                }
            }
            return true;
        },
        async jwt({ token, trigger, user, session, account }) {
            if (trigger === 'update' && session) {
                if (session.switchAccountId && token.sub) {
                    const allowed = await canSwitchToLinkedAccount(token.sub as string, session.switchAccountId);
                    if (allowed) {
                        const switchedUser = await prisma.user.findUnique({
                            where: { id: session.switchAccountId },
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                                image: true,
                            },
                        });

                        if (switchedUser) {
                            token.sub = switchedUser.id;
                            token.name = switchedUser.name;
                            token.email = switchedUser.email;
                            token.role = switchedUser.role;
                            token.image = switchedUser.image;
                        }
                    }
                }
                if (session.name && session.name.length > 0) token.name = session.name;
                if (session.email && session.email.length > 0) token.email = session.email;
                if (session.image && session.image.length > 0) token.image = session.image;
                if (session.role && session.role.length > 0) token.role = session.role;
            }
            if (user) {
                token.sub = user.id;
                token.name = user.name;
                token.email = user.email;
                token.role = user.role;
                token.image = user.image;

                if (account?.provider === 'google') {
                    try {
                        const cookieStore = await cookies();
                        const roleCookie = cookieStore.get('signup_role');
                        const role = roleCookie?.value;

                        if (role && ['braider', 'subcontractor', 'barn'].includes(role)) {
                            if (user.email) {
                                const updateData: any = { role: role as any };

                                if (role === 'braider') {
                                    const customer = await stripe.customers.create({
                                        email: user.email,
                                        name: user.name || undefined,
                                        metadata: {
                                            userId: user.id,
                                            role: 'braider',
                                        },
                                    });

                                    const trialEndDate = new Date();
                                    trialEndDate.setDate(trialEndDate.getDate() + 14);

                                    updateData.stripeCustomerId = customer.id;
                                    updateData.trialEndsAt = trialEndDate;
                                    updateData.subscriptionStatus = 'trialing';
                                    updateData.subscriptionTier = 'starter';
                                }

                                await prisma.user.update({
                                    where: { id: user.id },
                                    data: updateData,
                                });
                                token.role = role;
                            }
                        }
                    } catch (error) {
                        console.error('Error setting role during OAuth sign-in:', error);
                    }
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user && token) {
                session.user.id = token.sub as string;
                (session.user as any).role = token.role;
                (session.user as any).image = token.image;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: { strategy: 'jwt' },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
