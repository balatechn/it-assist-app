import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { Role } from '@prisma/client';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: Role;
            companyId: string;
            domain?: string;
        } & DefaultSession['user'];
    }

    interface User extends DefaultUser {
        id: string;
        role: Role;
        companyId: string;
        domain?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: Role;
        companyId: string;
        domain?: string;
    }
}
