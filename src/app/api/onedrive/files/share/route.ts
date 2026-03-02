import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No OneDrive connection" }, { status: 403 })
        }

        const { itemId } = await req.json()
        if (!itemId) {
            return NextResponse.json({ error: "Item ID required" }, { status: 400 })
        }

        const data = await fetchGraph(`/me/drive/items/${itemId}/createLink`, token, {
            method: "POST",
            body: JSON.stringify({
                type: "view",
                scope: "organization",
            }),
        })

        return NextResponse.json({ link: data.link?.webUrl || data.link?.webUrl })
    } catch (error) {
        console.error("Share error:", error)
        return NextResponse.json({ error: "Failed to create share link" }, { status: 500 })
    }
}
