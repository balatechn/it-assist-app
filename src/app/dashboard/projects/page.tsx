"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
    Plus, Search, FolderKanban, Calendar, Grid3X3, List,
    BarChart3, Columns3, GanttChart, X, Zap, DollarSign,
    CheckCircle2, Clock, PauseCircle, Loader2, ChevronRight,
} from "lucide-react"
import { cn, formatDate, formatCurrency, getInitials, getStatusColor } from "@/lib/utils"
import { PROJECT_COLORS, PROJECT_TEMPLATES } from "@/lib/constants"
import ProjectGantt from "@/components/project-gantt"

interface Project {
    id: string
    name: string
    description: string | null
    clientName: string | null
    startDate: string | null
    endDate: string | null
    budget: number | null
    status: string
    progress: number
    color: string | null
    manager: { id: string; name: string } | null
    _count: { tasks: number; files: number }
}

type ViewMode = "grid" | "list" | "kanban" | "gantt"

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [view, setView] = useState<ViewMode>("gantt")
    const [filter, setFilter] = useState<string>("ALL")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    // Quick create
    const [showQuickCreate, setShowQuickCreate] = useState(false)
    const [showTemplates, setShowTemplates] = useState(false)
    const [creating, setCreating] = useState(false)
    const [quickForm, setQuickForm] = useState({
        name: "", description: "", clientName: "", startDate: "", endDate: "", budget: "", status: "PLANNED", color: PROJECT_COLORS[0],
    })
    const [createError, setCreateError] = useState<string | null>(null)
    const searchDebounce = useRef<ReturnType<typeof setTimeout>>()
    const [debouncedSearch, setDebouncedSearch] = useState("")

    // Debounce search input
    useEffect(() => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 350)
        return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
    }, [search])

    const fetchProjects = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(page), limit: "50" })
            if (filter !== "ALL") params.set("status", filter)
            if (debouncedSearch) params.set("search", debouncedSearch)
            const res = await fetch(`/api/projects?${params}`)
            if (res.ok) {
                const json = await res.json()
                setProjects(json.data ?? json)
                if (json.pagination) {
                    setTotalPages(json.pagination.totalPages)
                    setTotal(json.pagination.total)
                }
            }
        } finally {
            setLoading(false)
        }
    }, [page, filter, debouncedSearch])

    useEffect(() => {
        fetchProjects()
    }, [fetchProjects])

    const handleQuickCreate = async () => {
        if (!quickForm.name.trim()) return
        setCreating(true)
        setCreateError(null)
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...quickForm,
                    startDate: quickForm.startDate || null,
                    endDate: quickForm.endDate || null,
                    budget: quickForm.budget || null,
                }),
            })
            if (res.ok) {
                setShowQuickCreate(false)
                setQuickForm({ name: "", description: "", clientName: "", startDate: "", endDate: "", budget: "", status: "PLANNED", color: PROJECT_COLORS[0] })
                fetchProjects()
            } else {
                const data = await res.json().catch(() => ({}))
                setCreateError(data.error || "Failed to create project")
            }
        } catch {
            setCreateError("Network error")
        } finally {
            setCreating(false)
        }
    }

    const applyTemplate = (tpl: typeof PROJECT_TEMPLATES[0]) => {
        setQuickForm({ ...quickForm, name: tpl.name, description: tpl.description, color: tpl.color, status: tpl.status })
        setShowTemplates(false)
        setShowQuickCreate(true)
    }

    // Data is already filtered server-side, just use projects directly
    const filtered = projects

    const statusCounts = {
        ALL: total,
        ACTIVE: projects.filter(p => p.status === "ACTIVE").length,
        PLANNED: projects.filter(p => p.status === "PLANNED").length,
        COMPLETED: projects.filter(p => p.status === "COMPLETED").length,
        ON_HOLD: projects.filter(p => p.status === "ON_HOLD").length,
    }

    // Dashboard summary
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
    const avgProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0

    // Kanban columns
    const kanbanColumns = [
        { id: "PLANNED", label: "Planned", icon: Clock, color: "text-blue-500" },
        { id: "ACTIVE", label: "Active", icon: Zap, color: "text-amber-500" },
        { id: "COMPLETED", label: "Completed", icon: CheckCircle2, color: "text-emerald-500" },
        { id: "ON_HOLD", label: "On Hold", icon: PauseCircle, color: "text-slate-400" },
    ]



    const viewButtons: { id: ViewMode; icon: typeof Grid3X3; label: string }[] = [
        { id: "grid", icon: Grid3X3, label: "Grid" },
        { id: "list", icon: List, label: "List" },
        { id: "kanban", icon: Columns3, label: "Kanban" },
        { id: "gantt", icon: GanttChart, label: "Gantt" },
    ]

    // ─── Keyboard Shortcuts ─────────────────────────────────────────────────────
    const searchRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                if (e.key === "Escape") {
                    ;(e.target as HTMLElement).blur()
                    setShowQuickCreate(false)
                    setShowTemplates(false)
                }
                return
            }
            if (e.key === "n" || e.key === "N") {
                e.preventDefault()
                setShowQuickCreate(true)
            }
            if (e.key === "/") {
                e.preventDefault()
                searchRef.current?.focus()
            }
            if (e.key === "Escape") {
                setShowQuickCreate(false)
                setShowTemplates(false)
            }
            if (e.key === "1") setView("grid")
            if (e.key === "2") setView("list")
            if (e.key === "3") setView("kanban")
            if (e.key === "4") setView("gantt")
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    // ─── Skeleton Loading ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                {/* Header skeleton */}
                <div className="flex justify-between items-center">
                    <div>
                        <div className="h-7 w-32 bg-muted rounded-md animate-pulse" />
                        <div className="h-4 w-24 bg-muted/60 rounded-md animate-pulse mt-2" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-9 w-28 bg-muted rounded-md animate-pulse" />
                        <div className="h-9 w-32 bg-muted rounded-md animate-pulse" />
                    </div>
                </div>
                {/* Summary cards skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
                                <div>
                                    <div className="h-3 w-16 bg-muted/60 rounded animate-pulse" />
                                    <div className="h-6 w-10 bg-muted rounded animate-pulse mt-1" />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
                {/* Project cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <div className="h-1.5 bg-muted animate-pulse" />
                            <div className="p-5 space-y-4">
                                <div className="flex justify-between">
                                    <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                                    <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
                                </div>
                                <div className="h-3 w-full bg-muted/50 rounded animate-pulse" />
                                <div className="h-3 w-2/3 bg-muted/50 rounded animate-pulse" />
                                <div className="flex justify-between items-center">
                                    <div className="h-2 w-full bg-muted rounded-full animate-pulse" />
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <div className="flex gap-3">
                                        <div className="h-4 w-14 bg-muted/60 rounded animate-pulse" />
                                        <div className="h-4 w-14 bg-muted/60 rounded animate-pulse" />
                                    </div>
                                    <div className="h-6 w-6 bg-muted rounded-full animate-pulse" />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">Projects</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{total} total projects</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        <span className="hidden sm:inline">Templates</span>
                    </Button>
                    <Button size="sm" className="gradient-primary text-white" onClick={() => setShowQuickCreate(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        New Project
                    </Button>
                </div>
            </div>

            {/* Dashboard Summary Cards */}
            {view !== "gantt" && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <FolderKanban className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">Total</p>
                            <p className="text-lg font-bold">{projects.length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Zap className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">Active</p>
                            <p className="text-lg font-bold">{statusCounts.ACTIVE}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <BarChart3 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">Avg Progress</p>
                            <p className="text-lg font-bold">{avgProgress}%</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                            <DollarSign className="w-4 h-4 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">Budget</p>
                            <p className="text-lg font-bold">{totalBudget > 0 ? formatCurrency(totalBudget) : "—"}</p>
                        </div>
                    </div>
                </Card>
            </div>}

            {/* Templates Panel */}
            {showTemplates && (
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Project Templates</h3>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTemplates(false)}>
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                        {PROJECT_TEMPLATES.map((tpl) => (
                            <button
                                key={tpl.name}
                                onClick={() => applyTemplate(tpl)}
                                className="p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all text-left group"
                            >
                                <div className="w-8 h-8 rounded-md mb-2 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: tpl.color }}>
                                    {tpl.name.charAt(0)}
                                </div>
                                <p className="text-xs font-medium group-hover:text-primary transition-colors">{tpl.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{tpl.description}</p>
                            </button>
                        ))}
                    </div>
                </Card>
            )}

            {/* Quick Create Panel */}
            {showQuickCreate && (
                <Card className="p-4 border-primary/20">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Quick Create</h3>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowQuickCreate(false); setCreateError(null) }}>
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                    {createError && (
                        <div className="p-2.5 mb-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                            {createError}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground">Name *</label>
                            <Input placeholder="Project name" value={quickForm.name} onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })} className="h-9 text-sm" autoFocus />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground">Client</label>
                            <Input placeholder="Client name" value={quickForm.clientName} onChange={(e) => setQuickForm({ ...quickForm, clientName: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[11px] font-medium text-muted-foreground">Description</label>
                            <Input placeholder="Brief description" value={quickForm.description} onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground">Start Date</label>
                            <Input type="date" value={quickForm.startDate} onChange={(e) => setQuickForm({ ...quickForm, startDate: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground">End Date</label>
                            <Input type="date" value={quickForm.endDate} onChange={(e) => setQuickForm({ ...quickForm, endDate: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground">Budget</label>
                            <Input type="number" placeholder="0" value={quickForm.budget} onChange={(e) => setQuickForm({ ...quickForm, budget: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground">Status</label>
                            <select value={quickForm.status} onChange={(e) => setQuickForm({ ...quickForm, status: e.target.value })} className="flex h-9 w-full rounded-md border bg-background px-3 text-sm">
                                <option value="PLANNED">Planned</option>
                                <option value="ACTIVE">Active</option>
                                <option value="ON_HOLD">On Hold</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[11px] font-medium text-muted-foreground">Color</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {PROJECT_COLORS.map((c) => (
                                    <button key={c} type="button" onClick={() => setQuickForm({ ...quickForm, color: c })}
                                        className={cn("w-7 h-7 rounded-full transition-all", quickForm.color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105")}
                                        style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => { setShowQuickCreate(false); setCreateError(null) }}>Cancel</Button>
                        <Button size="sm" className="gradient-primary text-white" onClick={handleQuickCreate} disabled={creating || !quickForm.name.trim()}>
                            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                            Create
                        </Button>
                    </div>
                </Card>
            )}

            {/* Filters + View Toggle + Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                    {(["ALL", "ACTIVE", "PLANNED", "COMPLETED", "ON_HOLD"] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => { setFilter(status); setPage(1) }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                                filter === status
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {status.replace("_", " ")} ({statusCounts[status]})
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            ref={searchRef}
                            placeholder="Search projects... (press /)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 w-44 md:w-56 bg-muted/50 border-0 h-9 text-sm"
                        />
                    </div>
                    <div className="flex border border-border rounded-lg overflow-hidden">
                        {viewButtons.map(v => (
                            <button
                                key={v.id}
                                onClick={() => setView(v.id)}
                                className={cn("p-2 transition-colors", view === v.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                                title={v.label}
                            >
                                <v.icon className="w-4 h-4" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ===== GRID VIEW ===== */}
            {view === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((project) => (
                        <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                            <Card className="hover:shadow-lg hover:border-primary/20 transition-all duration-300 group cursor-pointer h-full">
                                <CardContent className="p-4 md:p-5 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                                                style={{ backgroundColor: project.color || "#3B82F6" }}>
                                                {project.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
                                                <p className="text-xs text-muted-foreground">{project.clientName || "No client"}</p>
                                            </div>
                                        </div>
                                        <Badge className={cn("text-[10px] shrink-0", getStatusColor(project.status))}>
                                            {project.status.replace("_", " ")}
                                        </Badge>
                                    </div>
                                    {project.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                                    )}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium">{project.progress}%</span>
                                        </div>
                                        <Progress value={project.progress} className="h-1.5" indicatorClassName={project.progress === 100 ? "bg-emerald-500" : ""} />
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1"><FolderKanban className="w-3 h-3" /> {project._count.tasks} tasks</span>
                                            {project.endDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(project.endDate)}</span>}
                                        </div>
                                        {project.manager && (
                                            <Avatar className="w-6 h-6">
                                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{getInitials(project.manager.name)}</AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* ===== LIST VIEW ===== */}
            {view === "list" && (
                <Card>
                    <div className="divide-y divide-border/50">
                        {filtered.map((project) => (
                            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                                <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-muted/50 transition-all duration-200 group cursor-pointer">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color || "#3B82F6" }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{project.name}</p>
                                        <p className="text-xs text-muted-foreground">{project.clientName || "No client"}</p>
                                    </div>
                                    <Badge className={cn("text-[10px] shrink-0", getStatusColor(project.status))}>
                                        {project.status.replace("_", " ")}
                                    </Badge>
                                    <div className="w-24 md:w-32 shrink-0 hidden sm:block">
                                        <Progress value={project.progress} className="h-1.5" />
                                    </div>
                                    <span className="text-xs font-medium w-10 text-right shrink-0 hidden sm:block">{project.progress}%</span>
                                    <span className="text-xs text-muted-foreground shrink-0 hidden md:block">{project._count.tasks} tasks</span>
                                    {project.manager && (
                                        <Avatar className="w-6 h-6 shrink-0 hidden sm:flex">
                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{getInitials(project.manager.name)}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </Card>
            )}

            {/* ===== KANBAN VIEW ===== */}
            {view === "kanban" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {kanbanColumns.map((col) => {
                        const colProjects = filtered.filter(p => p.status === col.id)
                        return (
                            <div key={col.id} className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <col.icon className={cn("w-4 h-4", col.color)} />
                                    <h3 className="text-sm font-semibold">{col.label}</h3>
                                    <Badge variant="secondary" className="text-[10px] ml-auto">{colProjects.length}</Badge>
                                </div>
                                <div className="space-y-2 min-h-[100px]">
                                    {colProjects.map((project) => (
                                        <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                                            <Card className="p-3 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                                        style={{ backgroundColor: project.color || "#3B82F6" }}>
                                                        {project.name.charAt(0)}
                                                    </div>
                                                    <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{project.name}</p>
                                                </div>
                                                {project.description && (
                                                    <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{project.description}</p>
                                                )}
                                                <Progress value={project.progress} className="h-1 mb-2" />
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-muted-foreground">{project._count.tasks} tasks</span>
                                                    <span className="text-[10px] font-medium">{project.progress}%</span>
                                                </div>
                                            </Card>
                                        </Link>
                                    ))}
                                    {colProjects.length === 0 && (
                                        <div className="text-center py-8 text-xs text-muted-foreground/50 border border-dashed rounded-lg">
                                            No projects
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ===== GANTT VIEW ===== */}
            {view === "gantt" && <ProjectGantt />}

            {/* Empty state */}
            {filtered.length === 0 && !loading && (
                <div className="text-center py-12 md:py-16">
                    <FolderKanban className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No projects found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {search ? "Try adjusting your search" : "Create your first project to get started"}
                    </p>
                    <Button className="gradient-primary text-white" onClick={() => setShowQuickCreate(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Create Project
                    </Button>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} projects)</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                    </div>
                </div>
            )}
        </div>
    )
}
