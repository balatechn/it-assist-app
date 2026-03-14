"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    Cloud,
    Bell,
    Settings,
    Shield,
    Users,
    IndianRupee,
    Mail,
    Video,
    CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { isAdmin as checkIsAdmin } from "@/lib/utils"

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
    { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/dashboard/team", label: "Team", icon: Users },
    { href: "https://nationalgroupindia-my.sharepoint.com/", label: "OneDrive", icon: Cloud, external: true },
    { href: "/dashboard/finance", label: "Finance", icon: IndianRupee },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

const adminItems = [
    { href: "/dashboard/audit-logs", label: "Audit Logs", icon: Shield },
]

const ms365Items = [
    { href: "https://outlook.office.com/mail", label: "Outlook", icon: Mail, color: "text-[#e8b84a] hover:text-[#d4a030]" },
    { href: "https://teams.microsoft.com", label: "Teams", icon: Video, color: "text-orange-500 hover:text-orange-400" },
    { href: "https://outlook.office.com/calendar", label: "Calendar", icon: CalendarDays, color: "text-blue-500 hover:text-blue-400" },
]

export function TopNav() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const isAdmin = checkIsAdmin(session?.user?.role || "")

    const allItems = [...navItems, ...(isAdmin ? adminItems : [])]

    return (
        <nav className="hidden md:block sticky top-14 md:top-16 z-20 bg-background/95 backdrop-blur-xl border-b border-border/50">
            <div className="flex items-center gap-0.5 px-4 h-11 overflow-x-auto scrollbar-hide">
                {allItems.map((item) => {
                    const isExternal = "external" in item && item.external
                    const isActive = !isExternal && (
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href))
                    )
                    const Tag = isExternal ? "a" : Link
                    const extraProps = isExternal
                        ? { target: "_blank" as const, rel: "noopener noreferrer" }
                        : {}

                    return (
                        <Tag
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border",
                                isActive
                                    ? "bg-[#DAA520] text-white border-[#DAA520] shadow-sm"
                                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50 hover:border-border/50"
                            )}
                            {...extraProps}
                        >
                            <item.icon className={cn(
                                "w-4 h-4 shrink-0",
                                isActive ? "text-white" : ""
                            )} />
                            <span>{item.label}</span>
                        </Tag>
                    )
                })}

                {/* Spacer */}
                <div className="ml-auto" />

                {/* M365 shortcuts */}
                {ms365Items.map((item) => (
                    <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={item.label}
                        className={`p-1.5 rounded-lg transition-all duration-200 hover:bg-muted/50 ${item.color}`}
                    >
                        <item.icon className="w-4 h-4" />
                    </a>
                ))}
            </div>
        </nav>
    )
}
