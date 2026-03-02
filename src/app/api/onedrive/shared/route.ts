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
            return NextResponse.json({ error: "No OneDrive connection", requiresAuth: true }, { status: 403 })
        }

        try {
            const data = await fetchGraph("/me/drive/sharedWithMe", token)
            return NextResponse.json({ files: data.value || [] })
        } catch (e) {
            console.error("Shared with me error:", e)
            return NextResponse.json({ files: [] })
        }
    } catch (error) {
        console.error("Shared API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
