import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { reorderTasksSchema } from "@/lib/validations"

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const parsed = reorderTasksSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }
        const { updates } = parsed.data

        // Verify all tasks belong to user's organization
        const taskIds = updates.map((u) => u.id)
        const ownedCount = await prisma.task.count({
            where: {
                id: { in: taskIds },
                project: { organizationId: session.user.organizationId },
            },
        })
        if (ownedCount !== taskIds.length) {
            return NextResponse.json({ error: "Forbidden — tasks not in your organization" }, { status: 403 })
        }

        // Apply bulk updates inside a transaction
        await prisma.$transaction(
            updates.map((update: { id: string; sortOrder: number; status: string }) =>
                prisma.task.update({
                    where: { id: update.id },
                    data: {
                        sortOrder: update.sortOrder,
                        status: update.status as "TODO" | "IN_PROGRESS" | "DONE" | "NOT_STARTED" | "BLOCKED" | "CANCELLED",
                    },
                })
            )
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Task reorder error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
