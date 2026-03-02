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
        const parentId = searchParams.get("parentId")

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No OneDrive connection", requiresAuth: true }, { status: 403 })
        }

        const endpoint = parentId
            ? `/me/drive/items/${parentId}/children?$orderby=folder,name&$top=200`
            : `/me/drive/root/children?$orderby=folder,name&$top=200`

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

// Create upload session for file upload (returns pre-authenticated URL for direct upload)
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

        const { filename, parentId } = await req.json()
        if (!filename) {
            return NextResponse.json({ error: "Filename required" }, { status: 400 })
        }

        const encodedName = encodeURIComponent(filename)
        const endpoint = parentId
            ? `/me/drive/items/${parentId}:/${encodedName}:/createUploadSession`
            : `/me/drive/root:/${encodedName}:/createUploadSession`

        const data = await fetchGraph(endpoint, token, {
            method: "POST",
            body: JSON.stringify({
                item: { "@microsoft.graph.conflictBehavior": "rename" },
            }),
        })

        return NextResponse.json({ uploadUrl: data.uploadUrl })
    } catch (error) {
        console.error("Upload session error:", error)
        return NextResponse.json({ error: "Failed to create upload session" }, { status: 500 })
    }
}

// Delete file or folder
export async function DELETE(req: Request) {
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

        await fetchGraph(`/me/drive/items/${itemId}`, token, { method: "DELETE" })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Delete error:", error)
        return NextResponse.json({ error: "Delete failed" }, { status: 500 })
    }
}

// Rename file or folder
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No OneDrive connection" }, { status: 403 })
        }

        const { itemId, newName } = await req.json()
        if (!itemId || !newName) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
        }

        const data = await fetchGraph(`/me/drive/items/${itemId}`, token, {
            method: "PATCH",
            body: JSON.stringify({ name: newName }),
        })

        return NextResponse.json({ item: data })
    } catch (error) {
        console.error("Rename error:", error)
        return NextResponse.json({ error: "Rename failed" }, { status: 500 })
    }
}
