import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { updateUserSchema } from "@/lib/validations"

// PATCH /api/users/[id] — Update user (admin only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Only admins can update users" }, { status: 403 })
        }

        // Verify user belongs to same org
        const existing = await prisma.user.findFirst({
            where: { id: params.id, organizationId: session.user.organizationId },
        })
        if (!existing) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const body = await req.json()
        const parsed = updateUserSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }

        const { name, email, role } = parsed.data

        // If email changed, check uniqueness
        if (email && email !== existing.email) {
            const emailTaken = await prisma.user.findUnique({ where: { email } })
            if (emailTaken) {
                return NextResponse.json({ error: "Email already in use" }, { status: 409 })
            }
        }

        const user = await prisma.user.update({
            where: { id: params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email }),
                ...(role !== undefined && { role }),
            },
            select: { id: true, name: true, email: true, role: true },
        })

        await logAction({
            action: "UPDATE",
            resource: "User",
            resourceId: params.id,
            details: `Updated user "${existing.name}"`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        })

        return NextResponse.json(user)
    } catch (error) {
        console.error("User PATCH error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// DELETE /api/users/[id] — Remove user (admin only, cannot delete self)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Only admins can delete users" }, { status: 403 })
        }
        if (params.id === session.user.id) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
        }

        const existing = await prisma.user.findFirst({
            where: { id: params.id, organizationId: session.user.organizationId },
        })
        if (!existing) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        await prisma.user.delete({ where: { id: params.id } })

        await logAction({
            action: "DELETE",
            resource: "User",
            resourceId: params.id,
            details: `Deleted user "${existing.name}" (${existing.email})`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("User DELETE error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
