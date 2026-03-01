import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

// GET /api/outlook/people?q=search — Search organization directory for contacts
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const query = searchParams.get("q") || ""

        if (!query || query.length < 2) {
            return NextResponse.json({ people: [] })
        }

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No Microsoft connection" }, { status: 403 })
        }

        // Search people using Microsoft Graph — combines org directory, contacts, and recent recipients
        const results: Array<{ name: string; email: string }> = []
        const seen = new Set<string>()

        // 1. Search /me/people (most relevant — recent contacts, org users)
        try {
            const peopleData = await fetchGraph(
                `/me/people?$search="${encodeURIComponent(query)}"&$top=10&$select=displayName,scoredEmailAddresses`,
                token
            )
            if (peopleData.value) {
                for (const person of peopleData.value) {
                    const email = person.scoredEmailAddresses?.[0]?.address
                    if (email && !seen.has(email.toLowerCase())) {
                        seen.add(email.toLowerCase())
                        results.push({
                            name: person.displayName || email,
                            email,
                        })
                    }
                }
            }
        } catch {
            // People API may not be available, fall through to users search
        }

        // 2. If few results, also search organization users
        if (results.length < 5) {
            try {
                const usersData = await fetchGraph(
                    `/users?$filter=startswith(displayName,'${encodeURIComponent(query)}') or startswith(mail,'${encodeURIComponent(query)}') or startswith(userPrincipalName,'${encodeURIComponent(query)}')&$top=10&$select=displayName,mail,userPrincipalName`,
                    token
                )
                if (usersData.value) {
                    for (const user of usersData.value) {
                        const email = user.mail || user.userPrincipalName
                        if (email && !seen.has(email.toLowerCase())) {
                            seen.add(email.toLowerCase())
                            results.push({
                                name: user.displayName || email,
                                email,
                            })
                        }
                    }
                }
            } catch {
                // User.Read.All may not be granted — org search won't work
            }
        }

        return NextResponse.json({ people: results.slice(0, 10) })
    } catch (error) {
        console.error("People search error:", error)
        return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }
}
