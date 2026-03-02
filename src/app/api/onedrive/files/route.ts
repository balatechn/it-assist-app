import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

// Allow uploads up to 4MB (Vercel serverless limit)
export const maxDuration = 30

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const parentId = searchParams.get("parentId")
        const driveId = searchParams.get("driveId")

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No OneDrive connection", requiresAuth: true }, { status: 403 })
        }

        // Support cross-drive navigation (for Shared With Me items)
        let endpoint: string
        if (driveId && parentId) {
            endpoint = `/drives/${driveId}/items/${parentId}/children?$top=200`
        } else if (parentId) {
            endpoint = `/me/drive/items/${parentId}/children?$top=200`
        } else {
            endpoint = `/me/drive/root/children?$top=200`
        }

        try {
            const data = await fetchGraph(endpoint, token)
            // Sort: folders first, then by name
            const items = (data.value || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
                const aIsFolder = !!a.folder
                const bIsFolder = !!b.folder
                if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1
                return ((a.name as string) || "").localeCompare((b.name as string) || "")
            })
            return NextResponse.json({ files: items })
        } catch (e: unknown) {
            console.error("Graph Error:", e)
            return NextResponse.json({ error: "Failed to fetch files from Microsoft OneDrive" }, { status: 500 })
        }
    } catch (error) {
        console.error("OneDrive GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// Upload file directly to OneDrive (server-side proxy, avoids CORS)
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

        const formData = await req.formData()
        const file = formData.get("file") as Blob | null
        const filename = formData.get("filename") as string
        const parentId = formData.get("parentId") as string

        if (!file || !filename) {
            return NextResponse.json({ error: "File and filename required" }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const encodedName = encodeURIComponent(filename)

        const endpoint = parentId
            ? `/me/drive/items/${parentId}:/${encodedName}:/content`
            : `/me/drive/root:/${encodedName}:/content`

        const graphRes = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/octet-stream",
            },
            body: buffer,
        })

        if (!graphRes.ok) {
            const err = await graphRes.json().catch(() => ({}))
            console.error("OneDrive upload error:", err)
            return NextResponse.json({ error: "Upload to OneDrive failed" }, { status: 500 })
        }

        const data = await graphRes.json()
        return NextResponse.json({ item: data })
    } catch (error) {
        console.error("Upload error:", error)
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
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
