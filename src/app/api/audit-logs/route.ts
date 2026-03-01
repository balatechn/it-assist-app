import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const logs = await prisma.auditLog.findMany({
            where: { organizationId: session.user.organizationId },
            include: {
                user: { select: { id: true, name: true, email: true, avatar: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        })

        return NextResponse.json(logs)
    } catch (error) {
        console.error("AuditLogs GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
