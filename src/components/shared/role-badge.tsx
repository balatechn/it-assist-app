"use client"

import { Badge } from "@/components/ui/badge"

const ROLE_STYLES: Record<string, string> = {
    SUPER_ADMIN: "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-600 border-amber-300/30",
    ADMIN: "bg-destructive/10 text-destructive",
    MANAGEMENT: "bg-purple-500/10 text-purple-500",
    MANAGER: "bg-blue-500/10 text-blue-500",
    EMPLOYEE: "bg-emerald-500/10 text-emerald-500",
}

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    MANAGEMENT: "Management",
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
}

export function RoleBadge({ role }: { role: string }) {
    return (
        <Badge className={ROLE_STYLES[role] || ROLE_STYLES.EMPLOYEE}>
            {ROLE_LABELS[role] || role}
        </Badge>
    )
}
