import prisma from "@/lib/db"

interface LogParams {
    action: string
    resource: string
    resourceId?: string
    details?: string
    userId: string
    organizationId: string
    ipAddress?: string
}

export async function logAction(params: LogParams) {
    try {
        await prisma.auditLog.create({
            data: {
                action: params.action,
                resource: params.resource,
                resourceId: params.resourceId,
                details: params.details,
                userId: params.userId,
                organizationId: params.organizationId,
                ipAddress: params.ipAddress,
            },
        })
    } catch (e) {
        console.error("Failed to write audit log", e)
    }
}
