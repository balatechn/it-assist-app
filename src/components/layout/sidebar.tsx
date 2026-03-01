"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { useEffect } from "react"
import { cn, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    Cloud,
    Bell,
    Settings,
    Shield,
    Moon,
    Sun,
    ChevronLeft,
    ChevronRight,
    Building2,
    Users,
    X,
    Mail,
} from "lucide-react"
import { useLayoutStore } from "@/lib/store"

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
    { href: "/dashboard/tasks", label: "My Tasks", icon: CheckSquare },
    { href: "/dashboard/team", label: "Team", icon: Users },
    { href: "/dashboard/files", label: "OneDrive", icon: Cloud },
    { href: "/dashboard/outlook", label: "Outlook", icon: Mail },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

const adminItems = [
    { href: "/dashboard/audit-logs", label: "Audit Logs", icon: Shield },
]

export function Sidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const { theme, setTheme } = useTheme()
    const collapsed = useLayoutStore((state) => state.sidebarCollapsed)
    const setCollapsed = useLayoutStore((state) => state.setSidebarCollapsed)
    const mobileSidebarOpen = useLayoutStore((state) => state.mobileSidebarOpen)
    const setMobileSidebarOpen = useLayoutStore((state) => state.setMobileSidebarOpen)

    const isAdmin = session?.user?.role === "ADMIN"

    // Auto-close mobile sidebar on route change
    useEffect(() => {
        setMobileSidebarOpen(false)
    }, [pathname, setMobileSidebarOpen])

    return (
        <>
            {/* Mobile backdrop */}
            {mobileSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}

            <aside
                className={cn(
                    "fixed left-0 top-0 z-50 h-screen bg-sidebar text-sidebar-foreground border-r border-white/5 flex flex-col transition-all duration-300",
                    // Desktop: always visible, controlled by collapsed state
                    "hidden md:flex",
                    collapsed ? "md:w-[70px]" : "md:w-[260px]",
                    // Mobile: show/hide based on mobileSidebarOpen
                    mobileSidebarOpen && "!flex w-[260px]"
                )}
            >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 h-16 border-b border-white/5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                    <Building2 className="w-5 h-5 text-white" />
                </div>
                {(!collapsed || mobileSidebarOpen) && (
                    <div className="flex flex-col flex-1">
                        <span className="text-sm font-bold text-white tracking-tight">National Group</span>
                        <span className="text-[10px] text-emerald-400 font-medium tracking-widest uppercase">India</span>
                    </div>
                )}
                {/* Mobile close button */}
                {mobileSidebarOpen && (
                    <button
                        onClick={() => setMobileSidebarOpen(false)}
                        className="md:hidden p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {(!collapsed || mobileSidebarOpen) && (
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                        Menu
                    </p>
                )}
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                isActive
                                    ? "bg-sidebar-accent text-white shadow-sm"
                                    : "text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/50"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 shrink-0 transition-colors",
                                isActive ? "text-blue-400" : "text-sidebar-foreground/40 group-hover:text-blue-400/70"
                            )} />
                            {(!collapsed || mobileSidebarOpen) && <span>{item.label}</span>}
                            {isActive && (!collapsed || mobileSidebarOpen) && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            )}
                        </Link>
                    )
                })}

                {isAdmin && (
                    <>
                        {(!collapsed || mobileSidebarOpen) && (
                            <p className="px-3 mt-6 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                                Admin
                            </p>
                        )}
                        {adminItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                        isActive
                                            ? "bg-sidebar-accent text-white shadow-sm"
                                            : "text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/50"
                                    )}
                                >
                                    <item.icon className="w-5 h-5 shrink-0 text-sidebar-foreground/40 group-hover:text-blue-400/70" />
                                    {(!collapsed || mobileSidebarOpen) && <span>{item.label}</span>}
                                </Link>
                            )
                        })}
                    </>
                )}


            </nav>

            {/* Bottom section */}
            <div className="border-t border-white/5 p-3 space-y-2">
                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/50 transition-all duration-200 w-full"
                >
                    {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {(!collapsed || mobileSidebarOpen) && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
                </button>

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent/50 transition-all duration-200 w-full"
                >
                    {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    {(!collapsed || mobileSidebarOpen) && <span>Collapse</span>}
                </button>

                {/* User info */}
                {session?.user && (
                    <div className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/30",
                        collapsed && !mobileSidebarOpen && "justify-center"
                    )}>
                        <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-blue-600 text-white text-xs">
                                {getInitials(session.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        {(!collapsed || mobileSidebarOpen) && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-white truncate">{session.user.name}</p>
                                <p className="text-[10px] text-sidebar-foreground/40 truncate">{session.user.organizationName}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
        </>
    )
}
