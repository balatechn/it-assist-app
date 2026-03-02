import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { isManager } from "@/lib/utils"
import { z } from "zod"

const createFileSchema = z.object({
    name: z.string().min(1, "File name is required").max(500),
    mimeType: z.string().max(200).optional().nullable(),
    size: z.number().int().min(0).optional().nullable(),
    oneDriveItemId: z.string().max(500).optional().nullable(),
    oneDriveUrl: z.string().url().max(2000).optional().nullable(),
    thumbnailUrl: z.string().url().max(2000).optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    taskId: z.string().uuid().optional().nullable(),
})

// GET /api/files — List file attachments for a project or task
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const projectId = searchParams.get("projectId")
        const taskId = searchParams.get("taskId")

        // Build where clause with org-scoping
        const where: Record<string, unknown> = {}

        if (taskId) {
            // Verify task belongs to user's org
            const task = await prisma.task.findFirst({
                where: { id: taskId, project: { organizationId: session.user.organizationId } },
            })
            if (!task) {
                return NextResponse.json({ error: "Task not found" }, { status: 404 })
            }
            where.taskId = taskId
        } else if (projectId) {
            // Verify project belongs to user's org
            const project = await prisma.project.findFirst({
                where: { id: projectId, organizationId: session.user.organizationId },
            })
            if (!project) {
                return NextResponse.json({ error: "Project not found" }, { status: 404 })
            }
            where.projectId = projectId
        } else {
            // Return all files for the org's projects
            where.project = { organizationId: session.user.organizationId }
        }

        const files = await prisma.fileAttachment.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100,
        })

        return NextResponse.json(files)
    } catch (error) {
        console.error("Files GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST /api/files — Create a file attachment record
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const parsed = createFileSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }

        const { name, mimeType, size, oneDriveItemId, oneDriveUrl, thumbnailUrl, projectId, taskId } = parsed.data

        // Must attach to at least a project or task
        if (!projectId && !taskId) {
            return NextResponse.json({ error: "Must specify projectId or taskId" }, { status: 400 })
        }

        // Verify project or task belongs to user's org
        if (projectId) {
            const project = await prisma.project.findFirst({
                where: { id: projectId, organizationId: session.user.organizationId },
            })
            if (!project) {
                return NextResponse.json({ error: "Project not found" }, { status: 404 })
            }
        }

        if (taskId) {
            const task = await prisma.task.findFirst({
                where: { id: taskId, project: { organizationId: session.user.organizationId } },
            })
            if (!task) {
                return NextResponse.json({ error: "Task not found" }, { status: 404 })
            }
        }

        const file = await prisma.fileAttachment.create({
            data: {
                name,
                mimeType: mimeType || null,
                size: size || null,
                oneDriveItemId: oneDriveItemId || null,
                oneDriveUrl: oneDriveUrl || null,
                thumbnailUrl: thumbnailUrl || null,
                projectId: projectId || null,
                taskId: taskId || null,
                uploadedById: session.user.id,
            },
        })

        await logAction({
            action: "CREATE",
            resource: "FileAttachment",
            resourceId: file.id,
            details: `Attached file "${name}"`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        })

        return NextResponse.json(file, { status: 201 })
    } catch (error) {
        console.error("Files POST error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// DELETE /api/files?id=xyz — Delete a file attachment
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const fileId = searchParams.get("id")
        if (!fileId) {
            return NextResponse.json({ error: "File id is required" }, { status: 400 })
        }

        // Verify file belongs to user's org (via project or task)
        const file = await prisma.fileAttachment.findFirst({
            where: {
                id: fileId,
                OR: [
                    { project: { organizationId: session.user.organizationId } },
                    { task: { project: { organizationId: session.user.organizationId } } },
                ],
            },
        })

        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 })
        }

        // Only admin, project manager, or the uploader can delete
        const role = session.user.role
        if (!isManager(role) && file.uploadedById !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        await prisma.fileAttachment.delete({ where: { id: fileId } })

        await logAction({
            action: "DELETE",
            resource: "FileAttachment",
            resourceId: fileId,
            details: `Deleted file "${file.name}"`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Files DELETE error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
