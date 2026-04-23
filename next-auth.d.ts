import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: string;
        } & DefaultSession['user'];
        switchAccountId?: string;
    }
    interface User {
        id: string;
        role: string;
    }
}
