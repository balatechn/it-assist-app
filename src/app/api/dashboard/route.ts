import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const orgId = session.user.organizationId
        const orgFilter = { project: { organizationId: orgId } }

        // Use count() queries instead of loading all tasks into memory
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
            lowPriority,
            mediumPriority,
            highPriority,
            urgentPriority,
            criticalPriority,
            newProjectsThisMonth,
            completedTasksThisMonth,
        ] = await Promise.all([
            prisma.project.count({ where: { organizationId: orgId } }),
            prisma.task.count({ where: orgFilter }),
            prisma.task.count({ where: { ...orgFilter, status: { not: "DONE" } } }),
            prisma.task.count({ where: { ...orgFilter, status: { not: "DONE" }, dueDate: { lt: now } } }),
            prisma.task.count({ where: { ...orgFilter, status: "DONE" } }),
            prisma.task.count({ where: { ...orgFilter, status: "TODO" } }),
            prisma.task.count({ where: { ...orgFilter, status: "IN_PROGRESS" } }),
            prisma.task.count({ where: { ...orgFilter, status: { not: "DONE" }, priority: "LOW" } }),
            prisma.task.count({ where: { ...orgFilter, status: { not: "DONE" }, priority: "MEDIUM" } }),
            prisma.task.count({ where: { ...orgFilter, status: { not: "DONE" }, priority: "HIGH" } }),
            prisma.task.count({ where: { ...orgFilter, status: { not: "DONE" }, priority: "URGENT" as never } }),
            prisma.task.count({ where: { ...orgFilter, status: { not: "DONE" }, priority: "CRITICAL" as never } }),
            prisma.project.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } } }),
            prisma.task.count({ where: { ...orgFilter, status: "DONE", updatedAt: { gte: startOfMonth } } }),
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
        }

        // Projects with task counts
        const projects = await prisma.project.findMany({
            where: { organizationId: orgId },
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

        // Recent tasks
        const recentTasks = await prisma.task.findMany({
            where: { project: { organizationId: orgId } },
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
        })
    } catch (error) {
        console.error("Dashboard API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
