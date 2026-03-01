import { NextAuthOptions } from "next-auth"
import prisma from "@/lib/db"
import { Role } from "@prisma/client"

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
    providers: [
        {
            id: "azure-ad",
            name: "Microsoft",
            type: "oauth",
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            authorization: {
                url: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/authorize`,
                params: {
                    scope: "openid profile email User.Read offline_access",
                    response_type: "code",
                },
            },
            token: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
            userinfo: "https://graph.microsoft.com/oidc/userinfo",
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
            jwks_endpoint: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/discovery/v2.0/keys`,
            checks: ["none"],
            idToken: true,
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name ?? profile.preferred_username,
                    email: profile.email ?? profile.preferred_username,
                }
            },
        },
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
