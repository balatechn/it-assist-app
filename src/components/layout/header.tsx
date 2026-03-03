"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Bell, LogOut, Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { useLayoutStore } from "@/lib/store"
import { SearchBar } from "./search-bar"

const pageTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/projects": "Projects",
    "/dashboard/tasks": "My Tasks",
    "/dashboard/files": "OneDrive Files",
    "/dashboard/notifications": "Notifications",
    "/dashboard/settings": "Settings",
    "/dashboard/audit-logs": "Audit Logs",
}

export function Header() {
    const { data: session } = useSession()
    const pathname = usePathname()
    const [unreadCount, setUnreadCount] = useState(0)
    const setMobileSidebarOpen = useLayoutStore((state) => state.setMobileSidebarOpen)

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications")
            if (res.ok) {
                const data = await res.json()
                setUnreadCount(data.unreadCount ?? 0)
            }
        } catch {
            // silently fail
        }
    }, [])

    useEffect(() => {
        fetchUnreadCount()
        let interval = setInterval(fetchUnreadCount, 30000)

        const handleVisibility = () => {
            if (document.hidden) {
                clearInterval(interval)
            } else {
                fetchUnreadCount()
                interval = setInterval(fetchUnreadCount, 30000)
            }
        }
        document.addEventListener("visibilitychange", handleVisibility)
        return () => {
            clearInterval(interval)
            document.removeEventListener("visibilitychange", handleVisibility)
        }
    }, [fetchUnreadCount])

    const getTitle = () => {
        if (pathname.startsWith("/dashboard/projects/") && pathname !== "/dashboard/projects") {
            return "Project Details"
        }
        return pageTitles[pathname] || "National Group India"
    }

    // Mobile search state
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 md:h-16 px-3 md:px-6 border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                {/* Mobile hamburger */}
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="md:hidden shrink-0"
                    onClick={() => setMobileSidebarOpen(true)}
                    aria-label="Open navigation menu"
                >
                    <Menu className="w-5 h-5" />
                </Button>
                <h1 className="text-base md:text-xl font-bold text-foreground tracking-tight truncate">{getTitle()}</h1>
            </div>

            <div className="flex items-center gap-1.5 md:gap-3">
                {/* Mobile search toggle */}
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="md:hidden"
                    onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                    aria-label={mobileSearchOpen ? "Close search" : "Open search"}
                >
                    <Search className="w-4.5 h-4.5 text-muted-foreground" />
                </Button>

                {/* Desktop search */}
                <SearchBar className="hidden md:block" />

                {/* Notifications */}
                <Link href="/dashboard/notifications">
                    <Button variant="ghost" size="icon-sm" className="relative" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}>
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] text-white flex items-center justify-center font-bold" style={{ background: '#d4a044' }}>
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </Button>
                </Link>

                {/* User menu */}
                {session?.user && (
                    <div className="flex items-center gap-1.5 md:gap-2 pl-2 md:pl-3 border-l border-border/50">
                        <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {getInitials(session.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="hidden md:block">
                            <p className="text-sm font-medium leading-tight">{session.user.name}</p>
                            <p className="text-[10px] text-muted-foreground">{session.user.role.replace("_", " ")}</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="ml-1"
                            aria-label="Sign out"
                        >
                            <LogOut className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Mobile search overlay */}
            {mobileSearchOpen && (
                <div className="absolute top-full left-0 right-0 md:hidden border-b border-border/50 bg-background/95 backdrop-blur-xl px-3 py-2 z-40">
                    <SearchBar mobile onResultClick={() => setMobileSearchOpen(false)} />
                </div>
            )}
        </header>
    )
}
