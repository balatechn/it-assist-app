import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { updateProjectSchema } from "@/lib/validations"
import { isManager, isAdmin, hasMinRole } from "@/lib/utils"

// GET /api/projects/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const orgId = session.user.organizationId
        const userId = session.user.id
        const role = session.user.role

        // Build where clause based on role
        const where: Record<string, unknown> = {
            id: params.id,
            organizationId: orgId,
        }

        if (!hasMinRole(role, "MANAGEMENT")) {
            if (role === "MANAGER") {
                where.OR = [
                    { creatorId: userId },
                    { managerId: userId },
                    { tasks: { some: { assigneeId: userId } } },
                    { ccUsers: { some: { id: userId } } },
                ]
            } else {
                // EMPLOYEE — must have an assigned task or be CC'd
                where.OR = [
                    { tasks: { some: { assigneeId: userId } } },
                    { ccUsers: { some: { id: userId } } },
                ]
            }
        }

        // For employees, only show tasks assigned to them within the project
        const taskWhere: Record<string, unknown> = { parentId: null }
        if (!hasMinRole(role, "MANAGER")) {
            taskWhere.OR = [
                { assigneeId: userId },
                { creatorId: userId },
            ]
        }

        const project = await prisma.project.findFirst({
            where,
            include: {
                creator: { select: { id: true, name: true, email: true, avatar: true } },
                manager: { select: { id: true, name: true, email: true, avatar: true } },
                ccUsers: { select: { id: true, name: true, email: true, avatar: true } },
                tasks: {
                    where: taskWhere,
                    include: {
                        assignee: { select: { id: true, name: true, avatar: true } },
                        subtasks: {
                            include: {
                                assignee: { select: { id: true, name: true, avatar: true } },
                            },
                            orderBy: { sortOrder: "asc" },
                        },
                        _count: { select: { comments: true, files: true, subtasks: true } },
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
        if (!isManager(role)) {
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
        const { name, description, clientName, startDate, endDate, budget, status, progress, color, managerId, ccUserIds } = parsed.data

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
                ...(ccUserIds !== undefined && {
                    ccUsers: { set: ccUserIds.map((id: string) => ({ id })) },
                }),
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

        if (!isAdmin(session.user.role)) {
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
