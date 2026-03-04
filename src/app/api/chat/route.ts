import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

// GET /api/chat — list user's recent chats
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const token = await getAccessToken(session.user.id)
    if (!token) return NextResponse.json({ error: "No Microsoft token. Please re-sign in." }, { status: 401 })

    try {
        // Fetch recent chats with last message preview
        const data = await fetchGraph(
            "/me/chats?$expand=lastMessagePreview,members&$top=50&$orderby=lastMessagePreview/createdDateTime desc",
            token
        )

        const chats = (data.value || []).map((chat: Record<string, unknown>) => {
            const members = (chat.members as Array<Record<string, unknown>>) || []
            const lastMsg = chat.lastMessagePreview as Record<string, unknown> | null

            // For 1:1 chats, find the other person's display name
            let displayName = (chat.topic as string) || ""
            let otherEmail = ""
            if (chat.chatType === "oneOnOne") {
                const other = members.find((m: Record<string, unknown>) =>
                    (m.email as string)?.toLowerCase() !== session.user.email?.toLowerCase()
                )
                displayName = (other?.displayName as string) || "Unknown"
                otherEmail = (other?.email as string) || ""
            } else if (!displayName) {
                displayName = members.map((m: Record<string, unknown>) => (m.displayName as string) || "").filter(Boolean).join(", ") || "Group Chat"
            }

            return {
                id: chat.id,
                topic: displayName,
                chatType: chat.chatType,
                otherEmail,
                memberCount: members.length,
                lastMessage: lastMsg ? {
                    body: ((lastMsg.body as Record<string, string>)?.content || "").replace(/<[^>]+>/g, "").slice(0, 100),
                    from: (lastMsg.from as Record<string, Record<string, string>>)?.user?.displayName || "",
                    createdAt: lastMsg.createdDateTime,
                } : null,
                createdAt: chat.createdDateTime,
            }
        })

        return NextResponse.json(chats)
    } catch (error) {
        console.error("Chat list error:", error)
        return NextResponse.json({ error: "Failed to load chats" }, { status: 500 })
    }
}

// POST /api/chat — create a new 1:1 chat (or get existing)
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const token = await getAccessToken(session.user.id)
    if (!token) return NextResponse.json({ error: "No Microsoft token" }, { status: 401 })

    const body = await req.json()
    const { userEmail } = body

    if (!userEmail) return NextResponse.json({ error: "userEmail is required" }, { status: 400 })

    // Look up the target user's Azure AD id
    const targetUser = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!targetUser?.azureAdId) {
        return NextResponse.json({ error: "User not found or not linked to Microsoft account" }, { status: 404 })
    }

    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!currentUser?.azureAdId) {
        return NextResponse.json({ error: "Your account is not linked to Microsoft" }, { status: 400 })
    }

    try {
        const chatData = await fetchGraph("/chats", token, {
            method: "POST",
            body: JSON.stringify({
                chatType: "oneOnOne",
                members: [
                    {
                        "@odata.type": "#microsoft.graph.aadUserConversationMember",
                        roles: ["owner"],
                        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${currentUser.azureAdId}')`,
                    },
                    {
                        "@odata.type": "#microsoft.graph.aadUserConversationMember",
                        roles: ["owner"],
                        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${targetUser.azureAdId}')`,
                    },
                ],
            }),
        })

        return NextResponse.json({ chatId: chatData.id })
    } catch (error) {
        console.error("Create chat error:", error)
        return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
    }
}
