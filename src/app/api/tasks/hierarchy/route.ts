import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasMinRole } from "@/lib/utils"

// GET /api/tasks/hierarchy — hierarchical tasks (parent tasks + subtasks nested)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const search = searchParams.get("search")?.trim()
        const status = searchParams.get("status")
        const projectId = searchParams.get("projectId")

        const { organizationId: orgId, id: userId, role } = session.user
        const isOrgWide = hasMinRole(role, "MANAGER")

        const where: Record<string, unknown> = {
            project: { organizationId: orgId },
            parentId: null,
        }

        if (!isOrgWide) {
            where.OR = [
                { assigneeId: userId },
                { creatorId: userId },
                { ccUsers: { some: { id: userId } } },
            ]
        }

        if (status && status !== "ALL") where.status = status
        if (projectId) where.projectId = projectId
        if (search) {
            const searchFilter = [
                { title: { contains: search, mode: "insensitive" as const } },
                { subtasks: { some: { title: { contains: search, mode: "insensitive" as const } } } },
            ]
            if (where.OR) {
                where.AND = [
                    { OR: where.OR as Record<string, unknown>[] },
                    { OR: searchFilter },
                ]
                delete where.OR
            } else {
                where.OR = searchFilter
            }
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                project: { select: { id: true, name: true, color: true } },
                assignee: { select: { id: true, name: true, avatar: true } },
                _count: { select: { subtasks: true, comments: true, files: true } },
                subtasks: {
                    include: {
                        assignee: { select: { id: true, name: true, avatar: true } },
                        _count: { select: { subtasks: true, comments: true, files: true } },
                        subtasks: {
                            include: {
                                assignee: { select: { id: true, name: true, avatar: true } },
                                _count: { select: { subtasks: true, comments: true, files: true } },
                            },
                            orderBy: { sortOrder: "asc" },
                        },
                    },
                    orderBy: { sortOrder: "asc" },
                },
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        })

        return NextResponse.json(tasks)
    } catch (error) {
        console.error("Tasks hierarchy GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
