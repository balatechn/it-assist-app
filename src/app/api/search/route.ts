import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

// GET /api/search?q=keyword
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const q = searchParams.get("q")?.trim()
        if (!q || q.length < 2) {
            return NextResponse.json({ projects: [], tasks: [] })
        }

        const orgId = session.user.organizationId

        // Search projects and tasks in parallel
        const [projects, tasks] = await Promise.all([
            prisma.project.findMany({
                where: {
                    organizationId: orgId,
                    OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { description: { contains: q, mode: "insensitive" } },
                        { clientName: { contains: q, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    color: true,
                    clientName: true,
                },
                take: 5,
                orderBy: { updatedAt: "desc" },
            }),
            prisma.task.findMany({
                where: {
                    project: { organizationId: orgId },
                    OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { description: { contains: q, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    project: { select: { id: true, name: true } },
                },
                take: 5,
                orderBy: { updatedAt: "desc" },
            }),
        ])

        return NextResponse.json({ projects, tasks })
    } catch (error) {
        console.error("Search error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
