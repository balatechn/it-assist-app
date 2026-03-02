import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { createTaskSchema } from "@/lib/validations"

// GET /api/tasks — Get tasks (with optional pagination and filters)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const projectId = searchParams.get("projectId")
        const assigneeId = searchParams.get("assigneeId")
        const status = searchParams.get("status")
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))

        const where: Record<string, unknown> = {
            project: { organizationId: session.user.organizationId },
        }

        if (projectId) where.projectId = projectId
        if (assigneeId) where.assigneeId = assigneeId
        if (status) where.status = status

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                include: {
                    project: { select: { id: true, name: true, color: true } },
                    assignee: { select: { id: true, name: true, avatar: true } },
                    creator: { select: { id: true, name: true } },
                    _count: { select: { comments: true, files: true } },
                },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.task.count({ where }),
        ])

        return NextResponse.json({
            data: tasks,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    } catch (error) {
        console.error("Tasks GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST /api/tasks — Create a new task
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const parsed = createTaskSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }
        const { title, description, dueDate, priority, status, projectId, assigneeId } = parsed.data

        // Verify project belongs to org
        const project = await prisma.project.findFirst({
            where: { id: projectId, organizationId: session.user.organizationId },
        })
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        // Get next sort order
        const maxOrder = await prisma.task.findFirst({
            where: { projectId },
            orderBy: { sortOrder: "desc" },
            select: { sortOrder: true },
        })

        const task = await prisma.task.create({
            data: {
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority: priority || "MEDIUM",
                status: status || "TODO",
                sortOrder: (maxOrder?.sortOrder || 0) + 1,
                projectId,
                assigneeId: assigneeId || null,
                creatorId: session.user.id,
            },
            include: {
                project: { select: { id: true, name: true, color: true } },
                assignee: { select: { id: true, name: true } },
            },
        })

        // Create notification if assigned
        if (assigneeId && assigneeId !== session.user.id) {
            await prisma.notification.create({
                data: {
                    type: "TASK_ASSIGNED",
                    title: "New task assigned",
                    message: `You've been assigned "${title}" in ${project.name}`,
                    userId: assigneeId,
                    link: `/dashboard/projects/${projectId}`,
                },
            })
        }

        await logAction({
            action: "CREATE",
            resource: "Task",
            resourceId: task.id,
            details: `Created task "${title}" in project "${project.name}"`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || undefined,
        })

        return NextResponse.json(task, { status: 201 })
    } catch (error) {
        console.error("Tasks POST error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
