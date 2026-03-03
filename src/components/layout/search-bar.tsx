"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Search, Loader2, CheckSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn, getStatusColor, getPriorityColor } from "@/lib/utils"

interface SearchResult {
    projects: Array<{ id: string; name: string; status: string; color: string | null; clientName: string | null }>
    tasks: Array<{ id: string; title: string; status: string; priority: string; project: { id: string; name: string } }>
}

interface SearchBarProps {
    /** Additional class name for the outer container */
    className?: string
    /** Whether this is the mobile variant */
    mobile?: boolean
    /** Callback when a result is clicked (e.g. to close mobile overlay) */
    onResultClick?: () => void
}

export function SearchBar({ className, mobile, onResultClick }: SearchBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
    const [searching, setSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

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
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [searchQuery])

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    // Reset on route change
    useEffect(() => {
        setShowResults(false)
        setSearchQuery("")
    }, [pathname])

    const handleNavigate = useCallback((path: string) => {
        router.push(path)
        setShowResults(false)
        onResultClick?.()
    }, [router, onResultClick])

    const hasNoResults = searchResults && searchResults.projects.length === 0 && searchResults.tasks.length === 0

    return (
        <div className={cn("relative", className)} ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
            )}
            <Input
                placeholder="Search projects, tasks..."
                className={cn(
                    "pl-9 bg-muted/50 border-0 focus-visible:ring-1",
                    mobile ? "w-full" : "w-64"
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults) setShowResults(true) }}
                autoFocus={mobile}
                aria-label="Search projects and tasks"
                role="combobox"
                aria-expanded={showResults}
            />

            {/* Search Results Dropdown */}
            {showResults && searchResults && (
                <div
                    className={cn(
                        "absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto",
                        mobile ? "right-0" : "w-96"
                    )}
                    role="listbox"
                >
                    {hasNoResults ? (
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
                                            role="option"
                                            aria-selected={false}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                                            onClick={() => handleNavigate(`/dashboard/projects/${p.id}`)}
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
                                            role="option"
                                            aria-selected={false}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                                            onClick={() => handleNavigate(`/dashboard/projects/${t.project.id}`)}
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
    )
}
