import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { isAdmin } from "@/lib/utils"

export const dynamic = "force-dynamic"

interface GraphUser {
    id: string
    displayName: string
    mail: string | null
    userPrincipalName: string
    jobTitle: string | null
    department: string | null
    officeLocation: string | null
    mobilePhone: string | null
    businessPhones?: string[]
}

async function fetchM365Users(accessToken: string): Promise<GraphUser[]> {
    let users: GraphUser[] = []
    try {
        const data = await fetchGraph(
            "/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,businessPhones&$top=999&$orderby=displayName",
            accessToken
        )
        users = data.value || []
    } catch {
        try {
            const data = await fetchGraph(
                "/me/people?$top=100&$select=displayName,emailAddresses,department,jobTitle",
                accessToken
            )
            users = (data.value || []).map((p: { displayName: string; emailAddresses?: Array<{ address: string }>; department?: string; jobTitle?: string }) => ({
                id: "",
                displayName: p.displayName,
                mail: p.emailAddresses?.[0]?.address || null,
                userPrincipalName: p.emailAddresses?.[0]?.address || "",
                jobTitle: p.jobTitle || null,
                department: p.department || null,
                officeLocation: null,
                mobilePhone: null,
            }))
        } catch {
            throw new Error("Failed to fetch directory. User.Read.All permission may be needed.")
        }
    }

    return users.filter(u =>
        u.displayName &&
        (u.mail || u.userPrincipalName) &&
        !u.userPrincipalName?.includes("#EXT#")
    )
}

// GET /api/users/microsoft — Fetch organization users from Microsoft 365 directory
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const accessToken = await getAccessToken(session.user.id)
        if (!accessToken) {
            return NextResponse.json({ error: "Microsoft auth required" }, { status: 403 })
        }

        const filtered = await fetchM365Users(accessToken)

        return NextResponse.json({
            users: filtered.map(u => ({
                microsoftId: u.id,
                name: u.displayName,
                email: u.mail || u.userPrincipalName,
                jobTitle: u.jobTitle,
                department: u.department,
                officeLocation: u.officeLocation,
                phone: u.mobilePhone || u.businessPhones?.[0] || null,
            }))
        })
    } catch (error) {
        console.error("Microsoft users GET error:", error)
        const msg = error instanceof Error ? error.message : "Internal server error"
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}

// POST /api/users/microsoft — Auto-import all M365 users into the org
export async function POST() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (!isAdmin(session.user.role)) {
            return NextResponse.json({ error: "Only admins can sync users" }, { status: 403 })
        }

        const accessToken = await getAccessToken(session.user.id)
        if (!accessToken) {
            return NextResponse.json({ error: "Microsoft auth required" }, { status: 403 })
        }

        const m365Users = await fetchM365Users(accessToken)

        // Get all existing users in the org (by email)
        const existingUsers = await prisma.user.findMany({
            where: { organizationId: session.user.organizationId },
            select: { email: true },
        })
        const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()))

        // Filter out already-existing users
        const newUsers = m365Users.filter(u => {
            const email = (u.mail || u.userPrincipalName).toLowerCase()
            return !existingEmails.has(email)
        })

        // Bulk create new users (no password — they use SSO)
        let addedCount = 0
        for (const u of newUsers) {
            const email = u.mail || u.userPrincipalName
            try {
                await prisma.user.create({
                    data: {
                        name: u.displayName,
                        email,
                        azureAdId: u.id || undefined,
                        role: "EMPLOYEE",
                        organizationId: session.user.organizationId,
                    },
                })
                addedCount++
            } catch (err) {
                // Skip duplicates (race condition safety)
                console.warn(`Skipped user ${email}:`, err)
            }
        }

        if (addedCount > 0) {
            await logAction({
                action: "CREATE",
                resource: "User",
                resourceId: "bulk-import",
                details: `Auto-imported ${addedCount} users from Microsoft 365 directory`,
                userId: session.user.id,
                organizationId: session.user.organizationId,
            })
        }

        return NextResponse.json({
            added: addedCount,
            skipped: m365Users.length - newUsers.length,
            total: m365Users.length,
        })
    } catch (error) {
        console.error("Microsoft users POST error:", error)
        const msg = error instanceof Error ? error.message : "Internal server error"
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
