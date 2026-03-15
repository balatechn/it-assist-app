import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasMinRole } from "@/lib/utils"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { organizationId: orgId, id: userId, role } = session.user
        const isOrgWide = hasMinRole(role, "MANAGEMENT")

        const where: Record<string, unknown> = { organizationId: orgId }

        if (!isOrgWide) {
            if (role === "MANAGER") {
                where.OR = [
                    { creatorId: userId },
                    { managerId: userId },
                    { tasks: { some: { assigneeId: userId } } },
                    { ccUsers: { some: { id: userId } } },
                ]
            } else {
                where.OR = [
                    { tasks: { some: { assigneeId: userId } } },
                    { ccUsers: { some: { id: userId } } },
                ]
            }
        }

        const taskWhere: Record<string, unknown> = { parentId: null }
        if (!hasMinRole(role, "MANAGER")) {
            taskWhere.OR = [{ assigneeId: userId }, { creatorId: userId }]
        }

        const projects = await prisma.project.findMany({
            where,
            select: {
                id: true, name: true, status: true,
                startDate: true, endDate: true, progress: true, color: true,
                manager: { select: { id: true, name: true, avatar: true } },
                tasks: {
                    where: taskWhere,
                    select: {
                        id: true, title: true, status: true, priority: true,
                        startDate: true, dueDate: true,
                        assignee: { select: { id: true, name: true, avatar: true } },
                        subtasks: {
                            select: {
                                id: true, title: true, status: true, priority: true,
                                startDate: true, dueDate: true,
                                assignee: { select: { id: true, name: true, avatar: true } },
                            },
                            orderBy: { sortOrder: "asc" },
                        },
                    },
                    orderBy: { sortOrder: "asc" },
                },
            },
            orderBy: { updatedAt: "desc" },
        })

        return NextResponse.json(projects)
    } catch (error) {
        console.error("Gantt GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
