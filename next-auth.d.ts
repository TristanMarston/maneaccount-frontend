import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: string; // Or use your Role enum if you import it from @prisma/client
        } & DefaultSession['user'];
    }
    interface User {
        id: string;
        role: string;
    }
}
