"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    Bell,
    HardDrive,
} from "lucide-react"
import { cn } from "@/lib/utils"

const bottomNavItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
    { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/dashboard/notifications", label: "Alerts", icon: Bell },
    { href: "/dashboard/files", label: "OneDrive", icon: HardDrive },
]

export function MobileBottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-1">
                {bottomNavItems.map((item) => {
                    const isActive = pathname === item.href || 
                        (item.href !== "/dashboard" && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-lg transition-colors",
                                isActive
                                    ? "text-[#b8956a]"
                                    : "text-muted-foreground"
                            )}
                        >
                            <div className="relative">
                                <item.icon className={cn(
                                    "w-5 h-5 transition-all",
                                    isActive && "scale-110"
                                )} />
                                {isActive && (
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#d4b078]" />
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] leading-tight",
                                isActive ? "font-semibold" : "font-medium"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
