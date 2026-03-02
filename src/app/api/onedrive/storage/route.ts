import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No OneDrive connection" }, { status: 403 })
        }

        try {
            const data = await fetchGraph("/me/drive", token)
            return NextResponse.json({
                quota: {
                    used: data.quota?.used || 0,
                    total: data.quota?.total || 0,
                    remaining: data.quota?.remaining || 0,
                    state: data.quota?.state || "normal",
                },
            })
        } catch (e) {
            console.error("Storage error:", e)
            return NextResponse.json({
                quota: { used: 0, total: 0, remaining: 0, state: "unknown" },
            })
        }
    } catch (error) {
        console.error("Storage API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
