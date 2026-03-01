import { NextAuthOptions } from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import prisma from "@/lib/db"
import { Role } from "@prisma/client"

export const authOptions: NextAuthOptions = {
    debug: true,
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
            authorization: {
                params: {
                    scope: "openid profile email User.Read Files.ReadWrite.All offline_access",
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            try {
                if (!user.email) return false

                let dbUser = await prisma.user.findUnique({
                    where: { email: user.email },
                })

                if (!dbUser) {
                    const domain = user.email.split("@")[1]
                    let org = await prisma.organization.findUnique({
                        where: { domain },
                    })
                    if (!org) {
                        org = await prisma.organization.create({
                            data: {
                                name: domain.split(".")[0].toUpperCase(),
                                domain,
                            },
                        })
                    }
                    dbUser = await prisma.user.create({
                        data: {
                            email: user.email,
                            name: user.name || "User",
                            azureAdId: account?.providerAccountId,
                            organizationId: org.id,
                            role: "TEAM_MEMBER",
                        },
                    })
                } else if (account?.providerAccountId && !dbUser.azureAdId) {
                    await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { azureAdId: account.providerAccountId },
                    })
                }

                if (account?.refresh_token) {
                    await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { msRefreshToken: account.refresh_token },
                    })
                }
                return true
            } catch (err) {
                console.error("signIn error:", err)
                return false
            }
        },
        async jwt({ token, user, account }) {
            if (account && user) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email! },
                    include: { organization: true },
                })
                if (dbUser) {
                    token.id = dbUser.id
                    token.role = dbUser.role as Role
                    token.organizationId = dbUser.organizationId
                    token.organizationName = dbUser.organization.name
                    token.avatar = dbUser.avatar || undefined
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
