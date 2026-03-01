"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Bell, LogOut, Search, Menu, CheckSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn, getInitials, getStatusColor, getPriorityColor } from "@/lib/utils"
import { useLayoutStore } from "@/lib/store"

interface SearchResult {
    projects: Array<{ id: string; name: string; status: string; color: string | null; clientName: string | null }>
    tasks: Array<{ id: string; title: string; status: string; priority: string; project: { id: string; name: string } }>
}

const pageTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/projects": "Projects",
    "/dashboard/tasks": "My Tasks",
    "/dashboard/files": "OneDrive Files",
    "/dashboard/notifications": "Notifications",
    "/dashboard/settings": "Settings",
    "/dashboard/audit-logs": "Audit Logs",
    "/dashboard/outlook": "Outlook",
}

export function Header() {
    const { data: session } = useSession()
    const pathname = usePathname()
    const router = useRouter()
    const [unreadCount, setUnreadCount] = useState(0)
    const setMobileSidebarOpen = useLayoutStore((state) => state.setMobileSidebarOpen)

    // Search state
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
    const [searching, setSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

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
        const interval = setInterval(fetchUnreadCount, 30000) // poll every 30s
        return () => clearInterval(interval)
    }, [fetchUnreadCount])

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!searchQuery.trim() || searchQuery.trim().length < 2) {
            setSearchResults(null)
            setShowResults(false)
            return
        }
        setSearching(true)
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`)
                if (res.ok) {
                    const data = await res.json()
                    setSearchResults(data)
                    setShowResults(true)
                }
            } catch {
                // silent
            } finally {
                setSearching(false)
            }
        }, 300)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [searchQuery])

    // Close search on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    // Close search on route change
    useEffect(() => {
        setShowResults(false)
        setSearchQuery("")
    }, [pathname])

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
                >
                    <Search className="w-4.5 h-4.5 text-muted-foreground" />
                </Button>

                {/* Desktop search */}
                <div className="relative hidden md:block" ref={searchRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
                    )}
                    <Input
                        placeholder="Search projects, tasks..."
                        className="w-64 pl-9 bg-muted/50 border-0 focus-visible:ring-1"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if (searchResults) setShowResults(true) }}
                    />

                    {/* Search Results Dropdown */}
                    {showResults && searchResults && (
                        <div className="absolute top-full left-0 mt-1 w-96 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
                            {searchResults.projects.length === 0 && searchResults.tasks.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No results found for &quot;{searchQuery}&quot;
                                </div>
                            ) : (
                                <>
                                    {searchResults.projects.length > 0 && (
                                        <div>
                                            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b">
                                                Projects
                                            </div>
                                            {searchResults.projects.map((p) => (
                                                <button
                                                    key={p.id}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                                                    onClick={() => {
                                                        router.push(`/dashboard/projects/${p.id}`)
                                                        setShowResults(false)
                                                    }}
                                                >
                                                    <div
                                                        className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
                                                        style={{ backgroundColor: p.color || "#3B82F6" }}
                                                    >
                                                        {p.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{p.name}</p>
                                                        {p.clientName && (
                                                            <p className="text-[10px] text-muted-foreground truncate">{p.clientName}</p>
                                                        )}
                                                    </div>
                                                    <Badge className={cn("text-[9px]", getStatusColor(p.status))}>
                                                        {p.status.replace("_", " ")}
                                                    </Badge>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {searchResults.tasks.length > 0 && (
                                        <div>
                                            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b">
                                                Tasks
                                            </div>
                                            {searchResults.tasks.map((t) => (
                                                <button
                                                    key={t.id}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                                                    onClick={() => {
                                                        router.push(`/dashboard/projects/${t.project.id}`)
                                                        setShowResults(false)
                                                    }}
                                                >
                                                    <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{t.title}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate">{t.project.name}</p>
                                                    </div>
                                                    <Badge className={cn("text-[9px]", getPriorityColor(t.priority))}>
                                                        {t.priority}
                                                    </Badge>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <Link href="/dashboard/notifications">
                    <Button variant="ghost" size="icon-sm" className="relative">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] text-white flex items-center justify-center font-bold" style={{ background: '#ac8c66' }}>
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
                        >
                            <LogOut className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Mobile search overlay */}
            {mobileSearchOpen && (
                <div className="absolute top-full left-0 right-0 md:hidden border-b border-border/50 bg-background/95 backdrop-blur-xl px-3 py-2 z-40">
                    <div className="relative" ref={searchRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
                        )}
                        <Input
                            placeholder="Search projects, tasks..."
                            className="w-full pl-9 bg-muted/50 border-0 focus-visible:ring-1"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => { if (searchResults) setShowResults(true) }}
                            autoFocus
                        />
                        {showResults && searchResults && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
                                {searchResults.projects.length === 0 && searchResults.tasks.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No results for &quot;{searchQuery}&quot;
                                    </div>
                                ) : (
                                    <>
                                        {searchResults.projects.map((p) => (
                                            <button
                                                key={p.id}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 text-left"
                                                onClick={() => { router.push(`/dashboard/projects/${p.id}`); setShowResults(false); setMobileSearchOpen(false) }}
                                            >
                                                <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: p.color || "#3B82F6" }}>
                                                    {p.name.charAt(0)}
                                                </div>
                                                <p className="text-sm font-medium truncate flex-1">{p.name}</p>
                                                <Badge className={cn("text-[9px]", getStatusColor(p.status))}>{p.status.replace("_", " ")}</Badge>
                                            </button>
                                        ))}
                                        {searchResults.tasks.map((t) => (
                                            <button
                                                key={t.id}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 text-left"
                                                onClick={() => { router.push(`/dashboard/projects/${t.project.id}`); setShowResults(false); setMobileSearchOpen(false) }}
                                            >
                                                <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <p className="text-sm font-medium truncate flex-1">{t.title}</p>
                                                <Badge className={cn("text-[9px]", getPriorityColor(t.priority))}>{t.priority}</Badge>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
