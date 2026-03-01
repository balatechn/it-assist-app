import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { updateProjectSchema } from "@/lib/validations"

// GET /api/projects/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const project = await prisma.project.findFirst({
            where: {
                id: params.id,
                organizationId: session.user.organizationId,
            },
            include: {
                creator: { select: { id: true, name: true, email: true, avatar: true } },
                manager: { select: { id: true, name: true, email: true, avatar: true } },
                tasks: {
                    include: {
                        assignee: { select: { id: true, name: true, avatar: true } },
                        _count: { select: { comments: true, files: true } },
                    },
                    orderBy: { sortOrder: "asc" },
                },
                files: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
                _count: { select: { tasks: true, files: true } },
            },
        })

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        return NextResponse.json(project)
    } catch (error) {
        console.error("Project GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// PATCH /api/projects/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = session.user.role
        if (role !== "ADMIN" && role !== "PROJECT_MANAGER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Verify project belongs to user's organization
        const existing = await prisma.project.findFirst({
            where: { id: params.id, organizationId: session.user.organizationId },
        })
        if (!existing) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        const body = await req.json()
        const parsed = updateProjectSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }
        const { name, description, clientName, startDate, endDate, budget, status, progress, color, managerId } = parsed.data

        const project = await prisma.project.update({
            where: { id: params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(clientName !== undefined && { clientName }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(budget !== undefined && { budget: budget ? parseFloat(String(budget)) : null }),
                ...(status !== undefined && { status }),
                ...(progress !== undefined && { progress: parseInt(String(progress)) }),
                ...(color !== undefined && { color }),
                ...(managerId !== undefined && { managerId: managerId || null }),
            },
        })

        await logAction({
            action: "UPDATE",
            resource: "Project",
            resourceId: params.id,
            details: `Updated project "${existing.name}"`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || undefined,
        })

        return NextResponse.json(project)
    } catch (error) {
        console.error("Project PATCH error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// DELETE /api/projects/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 })
        }

        // Verify project belongs to user's organization
        const existing = await prisma.project.findFirst({
            where: { id: params.id, organizationId: session.user.organizationId },
        })
        if (!existing) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        await prisma.project.delete({ where: { id: params.id } })

        await logAction({
            action: "DELETE",
            resource: "Project",
            resourceId: params.id,
            details: `Deleted project "${existing.name}"`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || undefined,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Project DELETE error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
