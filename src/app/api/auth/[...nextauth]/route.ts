import NextAuth, { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcryptjs from 'bcryptjs';
import { cookies } from 'next/headers';
import { generateUniquePublicID } from '@/app/actions/generatePublicID';
import { establishConnection } from '@/app/actions/join';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions as nextAuthOptions } from '@/app/api/auth/[...nextauth]/route';

export const authOptions: AuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            // authorization: {
            //     params: {
            //         scope: 'openid email profile https://www.googleapis.com/auth/calendar',
            //         prompt: 'consent',
            //         access_type: 'offline',
            //         response_type: 'code',
            //     },
            // },
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

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user) {
                    throw new Error('no_user');
                }

                if (!user.password) {
                    throw new Error('no_password_set');
                }

                if (!user || !user.password) return null;

                const isValid = await bcryptjs.compare(credentials.password, user.password);
                if (!isValid) {
                    throw new Error('wrong_password');
                }

                return user;
            },
        }),
    ],
    events: {
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                try {
                    const cookieStore = await cookies();
                    const roleCookie = cookieStore.get('signup_role');
                    const role = roleCookie?.value;

                    if (role && ['braider', 'subcontractor', 'barn', 'admin'].includes(role)) {
                        if (user.email) {
                            await prisma.user.update({
                                where: { email: user.email },
                                data: { role: role as any },
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error setting role during OAuth:', error);
                }
            }

            if (user.email) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: user.email },
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
                            where: { email: user.email },
                            data: { publicID: newID },
                        });
                    }
                } catch (error) {
                    console.error('Error generating public ID:', error);
                }

                const cookieStore = await cookies();
                const joinCookie = cookieStore.get('join_request_user');
                const targetPublicID = joinCookie?.value;

                if (targetPublicID) establishConnection(user.email);
            }
        },
    },
    callbacks: {
        async jwt({ token, trigger, user, session }) {
            if (trigger === 'update' && session) {
                if (session.name && session.name.length > 0) token.name = session.name;
                if (session.image && session.image.length > 0) token.image = session.image;
                if (session.role && session.role.length > 0) token.role = session.role;
            }
            if (user) {
                token.sub = user.id;
                token.name = user.name;
                token.role = user.role;
                token.image = user.image;
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
