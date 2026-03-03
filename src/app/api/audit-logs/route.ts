import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { isAdmin } from "@/lib/utils"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADMIN+ can view audit logs
        if (!isAdmin(session.user.role)) {
            return NextResponse.json({ error: "Forbidden — Admin access required" }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))

        const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where: { organizationId: session.user.organizationId },
            include: {
                user: { select: { id: true, name: true, email: true, avatar: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.auditLog.count({
            where: { organizationId: session.user.organizationId },
        }),
        ])

        return NextResponse.json({
            data: logs,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    } catch (error) {
        console.error("AuditLogs GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
