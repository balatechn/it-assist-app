import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import AzureADProvider from "next-auth/providers/azure-ad"
import bcrypt from "bcryptjs"
import prisma from "@/lib/db"
import { Role } from "@prisma/client"

export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
    providers: [
        // Azure AD provider
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
            authorization: {
                params: { scope: "openid profile email User.Read Files.ReadWrite.All offline_access" },
            },
        }),


        // Credentials provider for demo/development
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { organization: true },
                })

                if (!user || !user.password) {
                    throw new Error("Invalid credentials")
                }

                const isValid = await bcrypt.compare(credentials.password, user.password)
                if (!isValid) {
                    throw new Error("Invalid credentials")
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    organizationId: user.organizationId,
                    organizationName: user.organization.name,
                    avatar: user.avatar || undefined,
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "azure-ad") {
                if (!user.email) return false;

                let dbUser = await prisma.user.findUnique({
                    where: { email: user.email }
                });

                if (!dbUser) {
                    const domain = user.email.split("@")[1];
                    let org = await prisma.organization.findUnique({
                        where: { domain }
                    });

                    if (!org) {
                        org = await prisma.organization.create({
                            data: { name: domain.split('.')[0].toUpperCase(), domain }
                        });
                    }

                    dbUser = await prisma.user.create({
                        data: {
                            email: user.email,
                            name: user.name || "Azure User",
                            azureAdId: account.providerAccountId,
                            organizationId: org.id,
                            role: "TEAM_MEMBER",
                        }
                    });
                } else if (!dbUser.azureAdId) {
                    dbUser = await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { azureAdId: account.providerAccountId }
                    });
                }

                if (account.refresh_token) {
                    await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { msRefreshToken: account.refresh_token }
                    });
                }
                return true;
            }
            return true;
        },
        async jwt({ token, user, account }) {
            if (account && user) {
                if (account.provider === "azure-ad") {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: user.email! },
                        include: { organization: true }
                    });
                    if (dbUser) {
                        token.id = dbUser.id;
                        token.role = dbUser.role as Role;
                        token.organizationId = dbUser.organizationId;
                        token.organizationName = dbUser.organization.name;
                        token.avatar = dbUser.avatar || undefined;
                    }
                } else {
                    token.id = user.id
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    token.role = (user as any).role as Role
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    token.organizationId = (user as any).organizationId
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    token.organizationName = (user as any).organizationName
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    token.avatar = (user as any).avatar
                }
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as Role
                session.user.organizationId = token.organizationId as string
                session.user.organizationName = token.organizationName as string
                session.user.avatar = token.avatar as string | undefined
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
}
