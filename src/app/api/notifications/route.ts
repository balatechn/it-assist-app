import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

// GET /api/notifications
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        })

        const unreadCount = await prisma.notification.count({
            where: { userId: session.user.id, read: false },
        })

        return NextResponse.json({ notifications, unreadCount })
    } catch (error) {
        console.error("Notifications GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// PATCH /api/notifications — Mark all as read
export async function PATCH() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await prisma.notification.updateMany({
            where: { userId: session.user.id, read: false },
            data: { read: true },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Notifications PATCH error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
