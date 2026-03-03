import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { createProjectSchema } from "@/lib/validations"
import { hasMinRole } from "@/lib/utils"

// GET /api/projects — List projects scoped by role
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))
        const status = searchParams.get("status")
        const search = searchParams.get("search")?.trim()

        const orgId = session.user.organizationId
        const userId = session.user.id
        const role = session.user.role

        // MANAGEMENT+ sees all org projects
        // MANAGER sees projects they created/manage + projects with their assigned tasks
        // EMPLOYEE sees only projects where they have assigned tasks
        const isOrgWide = hasMinRole(role, "MANAGEMENT")
        const isManagerRole = role === "MANAGER"

        const where: Record<string, unknown> = {
            organizationId: orgId,
        }

        if (!isOrgWide) {
            if (isManagerRole) {
                where.OR = [
                    { creatorId: userId },
                    { managerId: userId },
                    { tasks: { some: { assigneeId: userId } } },
                ]
            } else {
                // EMPLOYEE — only projects with assigned tasks
                where.tasks = { some: { assigneeId: userId } }
            }
        }

        if (status) where.status = status
        if (search) {
            // Wrap existing conditions with AND to combine role filter + search
            const searchFilter = [
                { name: { contains: search, mode: "insensitive" } },
                { clientName: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ]
            if (where.OR) {
                // MANAGER already has OR for role — combine with AND
                const roleOr = where.OR
                delete where.OR
                where.AND = [
                    { OR: roleOr as Record<string, unknown>[] },
                    { OR: searchFilter },
                ]
            } else {
                where.OR = searchFilter
            }
        }

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    manager: { select: { id: true, name: true, email: true } },
                    _count: { select: { tasks: true, files: true } },
                },
                orderBy: { updatedAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.project.count({ where }),
        ])

        return NextResponse.json({
            data: projects,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        })
    } catch (error) {
        console.error("Projects GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST /api/projects — Create new project
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const parsed = createProjectSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }
        const { name, description, clientName, startDate, endDate, budget, status, color, managerId } = parsed.data

        const project = await prisma.project.create({
            data: {
                name,
                description,
                clientName,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                budget: budget ? parseFloat(String(budget)) : null,
                status: status || "PLANNED",
                color,
                organizationId: session.user.organizationId,
                creatorId: session.user.id,
                managerId: managerId || null,
            },
            include: {
                creator: { select: { id: true, name: true } },
                manager: { select: { id: true, name: true } },
            },
        })

        await logAction({
            action: "CREATE",
            resource: "Project",
            resourceId: project.id,
            details: `Created project "${name}"`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || undefined,
        })

        return NextResponse.json(project, { status: 201 })
    } catch (error) {
        console.error("Projects POST error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
