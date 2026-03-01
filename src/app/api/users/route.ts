import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { createUserSchema } from "@/lib/validations"
import bcrypt from "bcryptjs"

// GET /api/users — List org users
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const users = await prisma.user.findMany({
            where: { organizationId: session.user.organizationId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                createdAt: true,
                _count: {
                    select: {
                        assignedTasks: { where: { status: { not: "DONE" } } },
                        managedProjects: { where: { status: "ACTIVE" } },
                    }
                }
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error("Users GET error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST /api/users — Create (invite) a new user (admin only)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Only admins can create users" }, { status: 403 })
        }

        const body = await req.json()
        const parsed = createUserSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }

        const { name, email, password, role } = parsed.data

        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "TEAM_MEMBER",
                organizationId: session.user.organizationId,
            },
            select: { id: true, name: true, email: true, role: true },
        })

        await logAction({
            action: "CREATE",
            resource: "User",
            resourceId: user.id,
            details: `Created user "${name}" (${email})`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        })

        return NextResponse.json(user, { status: 201 })
    } catch (error) {
        console.error("Users POST error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
