import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const parentId = searchParams.get("parentId") // target a specific folder

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No OneDrive connection", requiresAuth: true }, { status: 403 })
        }

        // Try to fetch either from a specific internal folder or the root drive
        const endpoint = parentId ? `/me/drive/items/${parentId}/children` : `/me/drive/root/children`

        try {
            const data = await fetchGraph(endpoint, token)
            return NextResponse.json({ files: data.value })
        } catch (e: unknown) {
            console.error("Graph Error:", e)
            return NextResponse.json({ error: "Failed to fetch files from Microsoft OneDrive" }, { status: 500 })
        }
    } catch (error) {
        console.error("OneDrive GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
