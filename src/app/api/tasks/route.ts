import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { createTaskSchema } from "@/lib/validations"
import { sendMail, buildTaskAssignedEmail } from "@/lib/mail"
import { isManager } from "@/lib/utils"

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
        const priority = searchParams.get("priority")
        const department = searchParams.get("department")
        const dueDateFrom = searchParams.get("dueDateFrom")
        const dueDateTo = searchParams.get("dueDateTo")
        const search = searchParams.get("search")?.trim()
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))

        const where: Record<string, unknown> = {
            project: { organizationId: session.user.organizationId },
            parentId: null, // Only return top-level tasks, not subtasks
        }

        // EMPLOYEE role: only see tasks assigned to them, created by them, or CC'd on
        if (!isManager(session.user.role)) {
            where.OR = [
                { assigneeId: session.user.id },
                { creatorId: session.user.id },
                { ccUsers: { some: { id: session.user.id } } },
            ]
        }

        if (projectId) where.projectId = projectId
        if (assigneeId) where.assigneeId = assigneeId
        if (status) where.status = status
        if (priority) where.priority = priority
        if (department) where.department = department
        if (dueDateFrom || dueDateTo) {
            where.dueDate = {
                ...(dueDateFrom ? { gte: new Date(dueDateFrom) } : {}),
                ...(dueDateTo ? { lte: new Date(dueDateTo) } : {}),
            }
        }
        if (search) {
            // If we already have OR from role-based filter, wrap in AND
            const searchFilter = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { tags: { has: search } },
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

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                include: {
                    project: { select: { id: true, name: true, color: true } },
                    assignee: { select: { id: true, name: true, avatar: true } },
                    creator: { select: { id: true, name: true } },
                    ccUsers: { select: { id: true, name: true, avatar: true } },
                    _count: { select: { comments: true, files: true, subtasks: true } },
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
        const { title, description, startDate, dueDate, priority, status, projectId, assigneeId, parentId, tags, department, estimatedTime, ccUserIds } = parsed.data

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
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority: priority || "MEDIUM",
                status: status || "TODO",
                sortOrder: (maxOrder?.sortOrder || 0) + 1,
                projectId,
                assigneeId: assigneeId || null,
                creatorId: session.user.id,
                parentId: parentId || null,
                tags: tags || [],
                department: department || null,
                estimatedTime: estimatedTime ?? null,
                ...(ccUserIds && ccUserIds.length > 0 && {
                    ccUsers: { connect: ccUserIds.map((id: string) => ({ id })) },
                }),
            },
            include: {
                project: { select: { id: true, name: true, color: true } },
                assignee: { select: { id: true, name: true } },
            },
        })

        // Log activity
        await prisma.taskActivity.create({
            data: {
                action: "created",
                details: `Task "${title}" created`,
                taskId: task.id,
                userId: session.user.id,
            },
        })

        // Create notification + send email if assigned
        if (assigneeId) {
            const assignee = await prisma.user.findUnique({
                where: { id: assigneeId },
                select: { name: true, email: true },
            })

            // In-app notification (skip if self-assigned)
            if (assigneeId !== session.user.id) {
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

            // Always send email notification to assignee
            if (assignee?.email) {
                console.log(`Sending task assignment email to ${assignee.email} for task "${title}"...`)
                const appUrl = process.env.NEXTAUTH_URL || "https://sharepoint.nationalgroupindia.com"
                const htmlBody = buildTaskAssignedEmail({
                    assigneeName: assignee.name,
                    assignerName: session.user.name || "Someone",
                    taskTitle: title,
                    projectName: project.name,
                    dueDate: dueDate || null,
                    priority: priority || "MEDIUM",
                    appUrl,
                    projectId,
                })
                sendMail({
                    toEmail: assignee.email,
                    toName: assignee.name,
                    subject: `Task Assigned: ${title}`,
                    htmlBody,
                }).catch(err => console.error("Task create email error:", err))
            } else {
                console.warn(`No email found for assignee ${assigneeId}`)
            }
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
