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

        const { name, parentId } = await req.json()
        if (!name) {
            return NextResponse.json({ error: "Folder name required" }, { status: 400 })
        }

        const endpoint = parentId
            ? `/me/drive/items/${parentId}/children`
            : `/me/drive/root/children`

        const data = await fetchGraph(endpoint, token, {
            method: "POST",
            body: JSON.stringify({
                name,
                folder: {},
                "@microsoft.graph.conflictBehavior": "rename",
            }),
        })

        return NextResponse.json({ folder: data })
    } catch (error) {
        console.error("Create folder error:", error)
        return NextResponse.json({ error: "Failed to create folder" }, { status: 500 })
    }
}
