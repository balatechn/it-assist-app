import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { logAction } from "@/lib/audit"
import { z } from "zod"

const updateProfileSchema = z.object({
    name: z.string().min(1, "Name is required").max(200).optional(),
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

        const { name } = parsed.data

        const updateData: Record<string, unknown> = {}

        if (name !== undefined) {
            updateData.name = name
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
            details: `Updated own profile (name)`,
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
