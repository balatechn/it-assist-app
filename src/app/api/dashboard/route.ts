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

        const orgId = session.user.organizationId

        // Total projects
        const totalProjects = await prisma.project.count({
            where: { organizationId: orgId },
        })

        // All tasks for org
        const allTasks = await prisma.task.findMany({
            where: { project: { organizationId: orgId } },
            select: { status: true, priority: true, dueDate: true },
        })

        const now = new Date()
        const activeTasks = allTasks.filter(t => t.status !== "DONE").length
        const overdueTasks = allTasks.filter(
            t => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now
        ).length
        const doneTasks = allTasks.filter(t => t.status === "DONE").length
        const completionRate = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0

        // Tasks by priority
        const tasksByPriority = {
            LOW: allTasks.filter(t => t.priority === "LOW" && t.status !== "DONE").length,
            MEDIUM: allTasks.filter(t => t.priority === "MEDIUM" && t.status !== "DONE").length,
            HIGH: allTasks.filter(t => t.priority === "HIGH" && t.status !== "DONE").length,
        }

        // Tasks by status
        const tasksByStatus = {
            TODO: allTasks.filter(t => t.status === "TODO").length,
            IN_PROGRESS: allTasks.filter(t => t.status === "IN_PROGRESS").length,
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
        })
    } catch (error) {
        console.error("Dashboard API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
