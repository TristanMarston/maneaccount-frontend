import NextAuth, { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcryptjs from 'bcryptjs';
import { cookies } from 'next/headers';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        }),
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const authOptions: AuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
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

                    if (role && ['braider', 'subcontractor', 'client', 'admin'].includes(role)) {
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
        },
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.image = user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user && token) {
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
