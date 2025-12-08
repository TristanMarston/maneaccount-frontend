import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            role: string; // Or use your Role enum if you import it from @prisma/client
        } & DefaultSession['user'];
    }
    interface User {
        role: string;
    }
}
