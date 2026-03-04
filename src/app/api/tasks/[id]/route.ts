import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { updateTaskSchema } from "@/lib/validations"
import { sendMail, buildTaskAssignedEmail, buildTaskUpdatedEmail } from "@/lib/mail"
import { isManager } from "@/lib/utils"

// GET /api/tasks/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const task = await prisma.task.findFirst({
            where: {
                id: params.id,
                project: { organizationId: session.user.organizationId },
            },
            include: {
                project: { select: { id: true, name: true, color: true } },
                assignee: { select: { id: true, name: true, email: true, avatar: true } },
                creator: { select: { id: true, name: true, email: true } },
                subtasks: {
                    include: {
                        assignee: { select: { id: true, name: true, avatar: true } },
                    },
                    orderBy: { sortOrder: "asc" },
                },
                comments: {
                    include: {
                        author: { select: { id: true, name: true, avatar: true } },
                    },
                    orderBy: { createdAt: "desc" },
                },
                files: {
                    orderBy: { createdAt: "desc" },
                },
                _count: { select: { comments: true, files: true, subtasks: true } },
            },
        })

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        return NextResponse.json(task)
    } catch (error) {
        console.error("Task GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// PATCH /api/tasks/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify task belongs to user's organization
        const existing = await prisma.task.findFirst({
            where: {
                id: params.id,
                project: { organizationId: session.user.organizationId },
            },
        })
        if (!existing) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        const body = await req.json()
        const parsed = updateTaskSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }
        const { title, description, startDate, dueDate, priority, status, assigneeId, sortOrder } = parsed.data

        const task = await prisma.task.update({
            where: { id: params.id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(priority !== undefined && { priority }),
                ...(status !== undefined && { status }),
                ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
                ...(sortOrder !== undefined && { sortOrder }),
            },
            include: {
                project: { select: { id: true, name: true, color: true } },
                assignee: { select: { id: true, name: true } },
            },
        })

        // Send email if assignee changed to a new person
        const assigneeChanged = assigneeId && assigneeId !== existing.assigneeId
        if (assigneeChanged) {
            const [assignee, project] = await Promise.all([
                prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true, email: true } }),
                prisma.project.findUnique({ where: { id: existing.projectId }, select: { name: true } }),
            ])

            // In-app notification (skip if self-assigned)
            if (assigneeId !== session.user.id) {
                await prisma.notification.create({
                    data: {
                        type: "TASK_ASSIGNED",
                        title: "Task assigned to you",
                        message: `You've been assigned "${task.title}" in ${project?.name || "a project"}`,
                        userId: assigneeId,
                        link: `/dashboard/projects/${existing.projectId}`,
                    },
                })
            }

            // Always send email to new assignee
            if (assignee?.email) {
                console.log(`Sending task reassignment email to ${assignee.email} for task "${task.title}"...`)
                const appUrl = process.env.NEXTAUTH_URL || "https://sharepoint.nationalgroupindia.com"
                const htmlBody = buildTaskAssignedEmail({
                    assigneeName: assignee.name,
                    assignerName: session.user.name || "Someone",
                    taskTitle: task.title,
                    projectName: project?.name || "Unknown Project",
                    dueDate: task.dueDate?.toISOString() || null,
                    priority: task.priority,
                    appUrl,
                    projectId: existing.projectId,
                })
                sendMail({
                    toEmail: assignee.email,
                    toName: assignee.name,
                    subject: `Task Assigned: ${task.title}`,
                    htmlBody,
                }).catch(err => console.error("Task update email error:", err))
            } else {
                console.warn(`No email found for assignee ${assigneeId}`)
            }
        }

        // Notify existing assignee about task modifications (if not a reassignment)
        const effectiveAssigneeId = assigneeChanged ? null : (existing.assigneeId)
        if (effectiveAssigneeId && effectiveAssigneeId !== session.user.id) {
            // Build a list of what changed
            const changes: string[] = []
            if (status !== undefined && status !== existing.status) {
                changes.push(`Status changed from <strong>${existing.status.replace(/_/g, " ")}</strong> to <strong>${status.replace(/_/g, " ")}</strong>`)
            }
            if (priority !== undefined && priority !== existing.priority) {
                changes.push(`Priority changed from <strong>${existing.priority}</strong> to <strong>${priority}</strong>`)
            }
            if (title !== undefined && title !== existing.title) {
                changes.push(`Title changed to <strong>${title}</strong>`)
            }
            if (dueDate !== undefined) {
                const oldDue = existing.dueDate ? existing.dueDate.toISOString() : null
                const newDue = dueDate ? new Date(dueDate).toISOString() : null
                if (oldDue !== newDue) {
                    changes.push(newDue
                        ? `Due date set to <strong>${new Date(newDue).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>`
                        : `Due date removed`)
                }
            }

            if (changes.length > 0) {
                const assignee = await prisma.user.findUnique({
                    where: { id: effectiveAssigneeId },
                    select: { name: true, email: true },
                })
                const project = await prisma.project.findUnique({
                    where: { id: existing.projectId },
                    select: { name: true },
                })

                if (assignee?.email) {
                    console.log(`Sending task-updated email to ${assignee.email} for task "${task.title}" (${changes.length} changes)...`)
                    const appUrl = process.env.NEXTAUTH_URL || "https://sharepoint.nationalgroupindia.com"
                    const htmlBody = buildTaskUpdatedEmail({
                        assigneeName: assignee.name,
                        updaterName: session.user.name || "Someone",
                        taskTitle: task.title,
                        projectName: project?.name || "Unknown Project",
                        changes,
                        appUrl,
                        projectId: existing.projectId,
                    })
                    sendMail({
                        toEmail: assignee.email,
                        toName: assignee.name,
                        subject: `Task Updated: ${task.title}`,
                        htmlBody,
                    }).catch(err => console.error("Task modification email error:", err))
                }
            }
        }

        await logAction({
            action: "UPDATE",
            resource: "Task",
            resourceId: params.id,
            details: `Updated task "${existing.title}"`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || undefined,
        })

        return NextResponse.json(task)
    } catch (error) {
        console.error("Task PATCH error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// DELETE /api/tasks/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify task belongs to user's organization
        const existing = await prisma.task.findFirst({
            where: {
                id: params.id,
                project: { organizationId: session.user.organizationId },
            },
        })
        if (!existing) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        // Only task creator, assignee, or Manager+ can delete
        const isOwner = existing.creatorId === session.user.id || existing.assigneeId === session.user.id
        if (!isOwner && !isManager(session.user.role)) {
            return NextResponse.json({ error: "Forbidden — only creator, assignee, or managers can delete tasks" }, { status: 403 })
        }

        await prisma.task.delete({ where: { id: params.id } })

        await logAction({
            action: "DELETE",
            resource: "Task",
            resourceId: params.id,
            details: `Deleted task "${existing.title}"`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || undefined,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Task DELETE error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
