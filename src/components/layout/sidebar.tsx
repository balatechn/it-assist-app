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
    Users,
    X,
    Mail,
    Video,
    CalendarDays,
    IndianRupee,
} from "lucide-react"
import { useLayoutStore } from "@/lib/store"
import { isAdmin as checkIsAdmin } from "@/lib/utils"

const ms365Items = [
    { href: "https://outlook.office.com/mail", label: "Outlook", icon: Mail, color: "text-[#e8b84a] hover:text-[#d4a030]" },
    { href: "https://teams.microsoft.com", label: "Teams", icon: Video, color: "text-orange-500 hover:text-orange-400" },
    { href: "https://outlook.office.com/calendar", label: "Calendar", icon: CalendarDays, color: "text-blue-500 hover:text-blue-400" },
]

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
    { href: "/dashboard/tasks", label: "My Tasks", icon: CheckSquare },
    { href: "/dashboard/team", label: "Team", icon: Users },
    { href: "https://nationalgroupindia-my.sharepoint.com/", label: "OneDrive", icon: Cloud, external: true },
    { href: "/dashboard/finance", label: "Finance", icon: IndianRupee },
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

    const isAdmin = checkIsAdmin(session?.user?.role || "")

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
                    "fixed left-0 top-0 z-50 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-foreground/10 flex flex-col transition-all duration-300",
                    // Desktop: hidden (top nav replaces sidebar)
                    "hidden",
                    // Mobile: show/hide based on mobileSidebarOpen
                    mobileSidebarOpen && "!flex w-[260px]"
                )}
            >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-foreground/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.webp" alt="National Group India" className={cn("transition-all duration-300", collapsed && !mobileSidebarOpen ? "h-8 w-auto" : "h-9 w-auto")} />
                {(!collapsed || mobileSidebarOpen) && (
                    <div className="flex flex-col flex-1">
                        <span className="text-sm font-bold text-sidebar-foreground tracking-tight">National Group</span>
                        <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#e8b84a' }}>India</span>
                    </div>
                )}
                {/* Mobile close button */}
                {mobileSidebarOpen && (
                    <button
                        onClick={() => setMobileSidebarOpen(false)}
                        className="md:hidden p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                        aria-label="Close navigation menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {/* Microsoft 365 - Icon row */}
                {(!collapsed || mobileSidebarOpen) ? (
                    <div className="flex items-center gap-1 px-2 mb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 mr-auto">
                            M365
                        </p>
                        {ms365Items.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={item.label}
                                className={`p-2 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/50 ${item.color}`}
                            >
                                <item.icon className="w-4.5 h-4.5" />
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1 mb-3">
                        {ms365Items.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={item.label}
                                className={`p-2 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/50 ${item.color}`}
                            >
                                <item.icon className="w-5 h-5" />
                            </a>
                        ))}
                    </div>
                )}

                {/* Menu section */}
                {(!collapsed || mobileSidebarOpen) && (
                    <p className="px-3 mt-6 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                        Menu
                    </p>
                )}
                {collapsed && !mobileSidebarOpen && <div className="mt-4" />}
                {navItems.map((item) => {
                    const isExternal = 'external' in item && item.external
                    const isActive = !isExternal && (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)))
                    const Tag = isExternal ? 'a' : Link
                    const extraProps = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {}
                    return (
                        <Tag
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                                    : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            )}
                            {...extraProps}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 shrink-0 transition-colors",
                                isActive ? "text-[#e8b84a]" : "text-sidebar-foreground/55 group-hover:text-[#e8b84a]/70"
                            )} />
                            {(!collapsed || mobileSidebarOpen) && <span>{item.label}</span>}
                            {isActive && (!collapsed || mobileSidebarOpen) && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#e8b84a] animate-pulse" />
                            )}
                        </Tag>
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
                                    aria-current={isActive ? "page" : undefined}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group",
                                        isActive
                                            ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                                            : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                    )}
                                >
                                    <item.icon className="w-5 h-5 shrink-0 text-sidebar-foreground/55 group-hover:text-[#e8b84a]/70" />
                                    {(!collapsed || mobileSidebarOpen) && <span>{item.label}</span>}
                                </Link>
                            )
                        })}
                    </>
                )}

            </nav>

            {/* Bottom section */}
            <div className="border-t border-sidebar-foreground/10 p-3 space-y-2">
                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200 w-full"
                    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {(!collapsed || mobileSidebarOpen) && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
                </button>

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200 w-full"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
                            <AvatarFallback className="bg-[#c8932e] text-white text-xs">
                                {getInitials(session.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        {(!collapsed || mobileSidebarOpen) && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-sidebar-foreground truncate">{session.user.name}</p>
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
