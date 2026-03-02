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

        const { itemId, destinationId } = await req.json()
        if (!itemId) {
            return NextResponse.json({ error: "Item ID required" }, { status: 400 })
        }

        const parentRef = destinationId
            ? { id: destinationId }
            : { path: "/drive/root:" }

        const data = await fetchGraph(`/me/drive/items/${itemId}`, token, {
            method: "PATCH",
            body: JSON.stringify({
                parentReference: parentRef,
            }),
        })

        return NextResponse.json({ item: data })
    } catch (error) {
        console.error("Move error:", error)
        return NextResponse.json({ error: "Failed to move item" }, { status: 500 })
    }
}
