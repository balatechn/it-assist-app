import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

// GET /api/chat/[chatId]/messages — fetch messages for a chat
export async function GET(
    req: NextRequest,
    { params }: { params: { chatId: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const token = await getAccessToken(session.user.id)
    if (!token) return NextResponse.json({ error: "No Microsoft token" }, { status: 401 })

    const chatId = params.chatId
    const { searchParams } = new URL(req.url)
    const top = searchParams.get("top") || "50"

    try {
        const data = await fetchGraph(
            `/chats/${chatId}/messages?$top=${top}&$orderby=createdDateTime desc`,
            token
        )

        const messages = (data.value || [])
            .filter((m: Record<string, unknown>) => m.messageType === "message")
            .map((m: Record<string, unknown>) => {
                const from = m.from as Record<string, Record<string, string>> | null
                const body = m.body as Record<string, string>
                return {
                    id: m.id,
                    body: (body?.content || "").replace(/<[^>]+>/g, ""),
                    contentType: body?.contentType || "text",
                    from: {
                        displayName: from?.user?.displayName || "System",
                        email: from?.user?.userIdentityType === "aadUser" ? (from?.user?.id || "") : "",
                    },
                    createdAt: m.createdDateTime,
                    isCurrentUser: from?.user?.displayName === session.user.name,
                }
            })
            .reverse() // oldest first for display

        return NextResponse.json(messages)
    } catch (error) {
        console.error("Fetch messages error:", error)
        return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
    }
}

// POST /api/chat/[chatId]/messages — send a message
export async function POST(
    req: NextRequest,
    { params }: { params: { chatId: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const token = await getAccessToken(session.user.id)
    if (!token) return NextResponse.json({ error: "No Microsoft token" }, { status: 401 })

    const chatId = params.chatId
    const body = await req.json()
    const { message } = body

    if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 })

    try {
        const result = await fetchGraph(`/chats/${chatId}/messages`, token, {
            method: "POST",
            body: JSON.stringify({
                body: {
                    content: message.trim(),
                },
            }),
        })

        return NextResponse.json({
            id: result.id,
            body: message.trim(),
            createdAt: result.createdDateTime,
        })
    } catch (error) {
        console.error("Send message error:", error)
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }
}
