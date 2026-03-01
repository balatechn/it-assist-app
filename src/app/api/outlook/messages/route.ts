import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

// GET /api/outlook/messages — List messages from a folder
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const folder = searchParams.get("folder") || "inbox"
        const search = searchParams.get("search") || ""
        const skip = parseInt(searchParams.get("skip") || "0")
        const top = parseInt(searchParams.get("top") || "25")

        const token = await getAccessToken(session.user.id)
        if (!token) {
            return NextResponse.json({ error: "No Microsoft connection", requiresAuth: true }, { status: 403 })
        }

        // Map friendly folder names to Graph API folder names
        const folderMap: Record<string, string> = {
            inbox: "inbox",
            sent: "sentitems",
            drafts: "drafts",
            deleted: "deleteditems",
            archive: "archive",
            junk: "junkemail",
        }

        const graphFolder = folderMap[folder.toLowerCase()] || "inbox"
        let endpoint = `/me/mailFolders/${graphFolder}/messages?$top=${top}&$skip=${skip}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments,importance,flag,conversationId`

        if (search) {
            endpoint += `&$search="${encodeURIComponent(search)}"`
        }

        const data = await fetchGraph(endpoint, token)

        // Also get unread count for inbox
        let unreadCount = 0
        try {
            const inboxData = await fetchGraph("/me/mailFolders/inbox?$select=unreadItemCount", token)
            unreadCount = inboxData.unreadItemCount || 0
        } catch {
            // ignore
        }

        return NextResponse.json({
            messages: data.value || [],
            totalCount: data["@odata.count"] || data.value?.length || 0,
            unreadCount,
        })
    } catch (error) {
        console.error("Outlook GET error:", error)
        return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }
}

// POST /api/outlook/messages — Send a new email
export async function POST(req: Request) {
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
        const { to, cc, subject, content, replyToId } = body

        if (!to || !subject || !content) {
            return NextResponse.json({ error: "Missing required fields: to, subject, content" }, { status: 400 })
        }

        const toRecipients = (Array.isArray(to) ? to : [to]).map((email: string) => ({
            emailAddress: { address: email.trim() },
        }))

        const ccRecipients = cc
            ? (Array.isArray(cc) ? cc : [cc]).filter(Boolean).map((email: string) => ({
                emailAddress: { address: email.trim() },
            }))
            : []

        if (replyToId) {
            // Reply to an existing message
            await fetchGraph(`/me/messages/${replyToId}/reply`, token, {
                method: "POST",
                body: JSON.stringify({
                    message: {
                        toRecipients,
                        ccRecipients,
                        body: { contentType: "HTML", content },
                    },
                    comment: "",
                }),
            })
        } else {
            // Send a new email
            await fetchGraph("/me/sendMail", token, {
                method: "POST",
                body: JSON.stringify({
                    message: {
                        subject,
                        body: { contentType: "HTML", content },
                        toRecipients,
                        ccRecipients,
                    },
                    saveToSentItems: true,
                }),
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Outlook POST error:", error)
        return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }
}
