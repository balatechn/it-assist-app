import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { createCommentSchema } from "@/lib/validations"
import { isAdmin } from "@/lib/utils"

// GET /api/tasks/[id]/comments — List comments for a task
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify task belongs to user's organization
        const task = await prisma.task.findFirst({
            where: {
                id: params.id,
                project: { organizationId: session.user.organizationId },
            },
        })
        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        const comments = await prisma.taskComment.findMany({
            where: { taskId: params.id },
            include: {
                author: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(comments)
    } catch (error) {
        console.error("Comments GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST /api/tasks/[id]/comments — Add a comment to a task
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify task belongs to user's organization
        const task = await prisma.task.findFirst({
            where: {
                id: params.id,
                project: { organizationId: session.user.organizationId },
            },
            include: {
                project: { select: { name: true } },
                assignee: { select: { id: true } },
            },
        })
        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        const body = await req.json()
        const parsed = createCommentSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }

        const comment = await prisma.taskComment.create({
            data: {
                content: parsed.data.content,
                taskId: params.id,
                authorId: session.user.id,
            },
            include: {
                author: { select: { id: true, name: true, avatar: true } },
            },
        })

        // Notify task assignee (if different from commenter)
        if (task.assignee && task.assignee.id !== session.user.id) {
            await prisma.notification.create({
                data: {
                    type: "COMMENT_ADDED",
                    title: "New comment",
                    message: `${session.user.name} commented on "${task.title}"`,
                    userId: task.assignee.id,
                    link: `/dashboard/projects/${task.projectId}`,
                },
            })
        }

        await logAction({
            action: "CREATE",
            resource: "TaskComment",
            resourceId: comment.id,
            details: `Commented on task "${task.title}" in "${task.project.name}"`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || undefined,
        })

        return NextResponse.json(comment, { status: 201 })
    } catch (error) {
        console.error("Comments POST error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// DELETE /api/tasks/[id]/comments?commentId=xxx — Delete a comment (author or admin only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const commentId = searchParams.get("commentId")
        if (!commentId) {
            return NextResponse.json({ error: "commentId is required" }, { status: 400 })
        }

        const comment = await prisma.taskComment.findFirst({
            where: {
                id: commentId,
                taskId: params.id,
                task: { project: { organizationId: session.user.organizationId } },
            },
        })
        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 })
        }

        // Only author or admin can delete
        if (comment.authorId !== session.user.id && !isAdmin(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        await prisma.taskComment.delete({ where: { id: commentId } })

        await logAction({
            action: "DELETE",
            resource: "TaskComment",
            resourceId: commentId,
            details: `Deleted comment on task`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || undefined,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Comments DELETE error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
