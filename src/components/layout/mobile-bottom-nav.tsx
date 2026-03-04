"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    MessageSquare,
    Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"

const bottomNavItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard, external: false },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, external: false },
    { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare, external: false },
    { href: "/dashboard/chat", label: "Chat", icon: MessageSquare, external: false },
    { href: "https://outlook.office.com/mail", label: "Outlook", icon: Mail, external: true },
]

export function MobileBottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-1">
                {bottomNavItems.map((item) => {
                    const isActive = !item.external && (pathname === item.href || 
                        (item.href !== "/dashboard" && pathname.startsWith(item.href)))

                    if (item.external) {
                        return (
                            <a
                                key={item.href}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-lg transition-colors text-muted-foreground"
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-[10px] leading-tight font-medium">
                                    {item.label}
                                </span>
                            </a>
                        )
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-lg transition-colors",
                                isActive
                                    ? "text-[#d4a044]"
                                    : "text-muted-foreground"
                            )}
                        >
                            <div className="relative">
                                <item.icon className={cn(
                                    "w-5 h-5 transition-all",
                                    isActive && "scale-110"
                                )} />
                                {isActive && (
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#e8b84a]" />
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
