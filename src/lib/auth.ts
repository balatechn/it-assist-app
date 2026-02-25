import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/db";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "admin@rainlandautocorp.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { company: true }
                });

                // Demo logic: Since no real password hash is configured yet, 
                // we'll accept plain text match. In production, add bcrypt.
                if (!user || user.password !== credentials.password) {
                    throw new Error("Invalid credentials");
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    companyId: user.companyId,
                    domain: user.company?.domain || undefined
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role as Role;
                token.companyId = user.companyId;
                token.domain = user.domain;
            }

            // Allow God Mode updates context later
            if (trigger === "update" && session?.companyId && token.role === Role.SUPER_ADMIN) {
                token.companyId = session.companyId;
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as Role;
                session.user.companyId = token.companyId as string;
                session.user.domain = token.domain as string | undefined;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login', // Error code passed in query string as ?error=
    },
};
