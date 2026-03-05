import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasMinRole } from "@/lib/utils"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const orgId = session.user.organizationId
        const userId = session.user.id
        const role = session.user.role

        // MANAGEMENT, ADMIN, SUPER_ADMIN → see entire org
        // MANAGER → sees projects they created/manage + tasks in those projects + tasks assigned to them
        // EMPLOYEE → sees only projects where they have assigned tasks + only their tasks
        const isOrgWide = hasMinRole(role, "MANAGEMENT")
        const isManagerRole = role === "MANAGER"

        // ── Build filters based on role ──────────────────────────
        // Task filter
        let taskFilter: Record<string, unknown>
        // Project filter
        let projectFilter: Record<string, unknown>

        if (isOrgWide) {
            // MANAGEMENT+ sees everything in org
            taskFilter = { project: { organizationId: orgId } }
            projectFilter = { organizationId: orgId }
        } else if (isManagerRole) {
            // MANAGER sees tasks in projects they created/manage + tasks assigned to them + CC'd
            taskFilter = {
                project: { organizationId: orgId },
                OR: [
                    { assigneeId: userId },
                    { project: { creatorId: userId } },
                    { project: { managerId: userId } },
                    { ccUsers: { some: { id: userId } } },
                ],
            }
            projectFilter = {
                organizationId: orgId,
                OR: [
                    { creatorId: userId },
                    { managerId: userId },
                    { tasks: { some: { assigneeId: userId } } },
                    { ccUsers: { some: { id: userId } } },
                ],
            }
        } else {
            // EMPLOYEE sees only their assigned/created tasks, CC'd tasks, and those projects
            taskFilter = {
                project: { organizationId: orgId },
                OR: [
                    { assigneeId: userId },
                    { creatorId: userId },
                    { ccUsers: { some: { id: userId } } },
                ],
            }
            projectFilter = {
                organizationId: orgId,
                OR: [
                    { tasks: { some: { assigneeId: userId } } },
                    { ccUsers: { some: { id: userId } } },
                ],
            }
        }

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const [
            totalProjects,
            totalTasks,
            activeTasks,
            overdueTasks,
            doneTasks,
            todoCount,
            inProgressCount,
            notStartedCount,
            blockedCount,
            cancelledCount,
            lowPriority,
            mediumPriority,
            highPriority,
            urgentPriority,
            criticalPriority,
            newProjectsThisMonth,
            completedTasksThisMonth,
            assignedToMeCount,
            highPriorityCount,
        ] = await Promise.all([
            prisma.project.count({ where: projectFilter }),
            prisma.task.count({ where: taskFilter }),
            prisma.task.count({ where: { ...taskFilter, status: { notIn: ["DONE", "CANCELLED"] } } }),
            prisma.task.count({ where: { ...taskFilter, status: { notIn: ["DONE", "CANCELLED"] }, dueDate: { lt: now } } }),
            prisma.task.count({ where: { ...taskFilter, status: "DONE" } }),
            prisma.task.count({ where: { ...taskFilter, status: "TODO" } }),
            prisma.task.count({ where: { ...taskFilter, status: "IN_PROGRESS" } }),
            prisma.task.count({ where: { ...taskFilter, status: "NOT_STARTED" } }),
            prisma.task.count({ where: { ...taskFilter, status: "BLOCKED" } }),
            prisma.task.count({ where: { ...taskFilter, status: "CANCELLED" } }),
            prisma.task.count({ where: { ...taskFilter, status: { notIn: ["DONE", "CANCELLED"] }, priority: "LOW" } }),
            prisma.task.count({ where: { ...taskFilter, status: { notIn: ["DONE", "CANCELLED"] }, priority: "MEDIUM" } }),
            prisma.task.count({ where: { ...taskFilter, status: { notIn: ["DONE", "CANCELLED"] }, priority: "HIGH" } }),
            prisma.task.count({ where: { ...taskFilter, status: { notIn: ["DONE", "CANCELLED"] }, priority: "URGENT" as never } }),
            prisma.task.count({ where: { ...taskFilter, status: { notIn: ["DONE", "CANCELLED"] }, priority: "CRITICAL" as never } }),
            prisma.project.count({ where: { ...projectFilter, createdAt: { gte: startOfMonth } } }),
            prisma.task.count({ where: { ...taskFilter, status: "DONE", updatedAt: { gte: startOfMonth } } }),
            prisma.task.count({ where: { ...taskFilter, assigneeId: userId, status: { notIn: ["DONE", "CANCELLED"] } } }),
            prisma.task.count({ where: { ...taskFilter, status: { notIn: ["DONE", "CANCELLED"] }, priority: { in: ["HIGH", "URGENT" as never, "CRITICAL" as never] } } }),
        ])

        const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

        const tasksByPriority = {
            LOW: lowPriority,
            MEDIUM: mediumPriority,
            HIGH: highPriority,
            URGENT: urgentPriority,
            CRITICAL: criticalPriority,
        }

        const tasksByStatus = {
            TODO: todoCount,
            IN_PROGRESS: inProgressCount,
            DONE: doneTasks,
            NOT_STARTED: notStartedCount,
            BLOCKED: blockedCount,
            CANCELLED: cancelledCount,
        }

        // Fetch organization info
        const organization = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { name: true, logo: true, domain: true },
        })

        // Projects with task counts (scoped)
        const projects = await prisma.project.findMany({
            where: projectFilter,
            select: {
                id: true,
                name: true,
                status: true,
                progress: true,
                color: true,
                clientName: true,
                _count: { select: { tasks: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: 6,
        })

        // Recent tasks (scoped)
        const recentTasks = await prisma.task.findMany({
            where: taskFilter,
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
                project: { select: { name: true, color: true } },
                assignee: { select: { name: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: 8,
        })

        return NextResponse.json({
            totalProjects,
            activeTasks,
            overdueTasks,
            completionRate,
            tasksByPriority,
            tasksByStatus,
            projects,
            recentTasks,
            newProjectsThisMonth,
            completedTasksThisMonth,
            assignedToMe: assignedToMeCount,
            highPriorityTasks: highPriorityCount,
            organization: organization ? { name: organization.name, logo: organization.logo, domain: organization.domain } : null,
        })
    } catch (error) {
        console.error("Dashboard API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
