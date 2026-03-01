import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import bcrypt from "bcryptjs"
import { z } from "zod"

const updateProfileSchema = z.object({
    name: z.string().min(1, "Name is required").max(200).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, "Password must be at least 6 characters").max(100).optional(),
})

// PATCH /api/profile — Update own profile
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const parsed = updateProfileSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }

        const { name, currentPassword, newPassword } = parsed.data

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, password: true, name: true },
        })
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const updateData: Record<string, unknown> = {}

        // Update name
        if (name !== undefined) {
            updateData.name = name
        }

        // Update password
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: "Current password is required" }, { status: 400 })
            }
            if (!user.password) {
                return NextResponse.json({ error: "Cannot change password for SSO accounts" }, { status: 400 })
            }
            const valid = await bcrypt.compare(currentPassword, user.password)
            if (!valid) {
                return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
            }
            updateData.password = await bcrypt.hash(newPassword, 12)
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No changes provided" }, { status: 400 })
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
        })

        await logAction({
            action: "UPDATE",
            resource: "User",
            resourceId: session.user.id,
            details: `Updated own profile${name ? ' (name)' : ''}${newPassword ? ' (password)' : ''}`,
            userId: session.user.id,
            organizationId: session.user.organizationId,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Profile PATCH error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
