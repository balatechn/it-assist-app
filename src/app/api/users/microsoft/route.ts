import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

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

        // Fetch organization users from Graph API
        // Try /users first (requires User.Read.All), fallback to /people
        let users: GraphUser[] = []
        try {
            const data = await fetchGraph(
                "/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,businessPhones&$top=100&$orderby=displayName",
                accessToken
            )
            users = data.value || []
        } catch {
            // Fallback: try /me/people for contacts if User.Read.All not granted
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
                return NextResponse.json({ error: "Failed to fetch directory. User.Read.All permission may be needed." }, { status: 403 })
            }
        }

        // Filter out service accounts and empty entries
        const filtered = users.filter(u =>
            u.displayName &&
            (u.mail || u.userPrincipalName) &&
            !u.userPrincipalName?.includes("#EXT#") // exclude external/guest accounts
        )

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
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
