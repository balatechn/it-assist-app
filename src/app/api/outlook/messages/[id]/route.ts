import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

// GET /api/outlook/messages/[id] — Get a single message with full body
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No Microsoft connection" }, { status: 403 })
        }

        const message = await fetchGraph(
            `/me/messages/${params.id}?$select=id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,importance,flag,conversationId`,
            token
        )

        // Mark as read if not already
        if (!message.isRead) {
            try {
                await fetchGraph(`/me/messages/${params.id}`, token, {
                    method: "PATCH",
                    body: JSON.stringify({ isRead: true }),
                })
            } catch {
                // ignore marking error
            }
        }

        // Get attachments if any
        let attachments: unknown[] = []
        if (message.hasAttachments) {
            try {
                const attachData = await fetchGraph(
                    `/me/messages/${params.id}/attachments?$select=id,name,contentType,size`,
                    token
                )
                attachments = attachData.value || []
            } catch {
                // ignore
            }
        }

        return NextResponse.json({ message, attachments })
    } catch (error) {
        console.error("Outlook message GET error:", error)
        return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 })
    }
}

// DELETE /api/outlook/messages/[id] — Delete a message
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No Microsoft connection" }, { status: 403 })
        }

        await fetchGraph(`/me/messages/${params.id}`, token, {
            method: "DELETE",
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Outlook message DELETE error:", error)
        return NextResponse.json({ error: "Failed to delete email" }, { status: 500 })
    }
}

// PATCH /api/outlook/messages/[id] — Update message (mark read/unread, flag)
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No Microsoft connection" }, { status: 403 })
        }

        const body = await req.json()
        await fetchGraph(`/me/messages/${params.id}`, token, {
            method: "PATCH",
            body: JSON.stringify(body),
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Outlook message PATCH error:", error)
        return NextResponse.json({ error: "Failed to update email" }, { status: 500 })
    }
}
