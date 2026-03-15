"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
    ChevronRight, ChevronDown, Pencil, Loader2,
    ChevronsUpDown, GanttChart as GanttIcon, Minus,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ProjectEditModal } from "@/components/project-edit-modal"
import { TaskDetailModal } from "@/components/task-detail-modal"

// ─── Types ────────────────────────────────────────────────
interface Person { id: string; name: string; avatar: string | null }

interface SubtaskItem {
    id: string; title: string; status: string; priority: string
    startDate: string | null; dueDate: string | null
    assignee: Person | null
}

interface TaskItem {
    id: string; title: string; status: string; priority: string
    startDate: string | null; dueDate: string | null
    assignee: Person | null
    subtasks: SubtaskItem[]
}

interface ProjectItem {
    id: string; name: string; status: string
    startDate: string | null; endDate: string | null
    progress: number; color: string | null
    manager: Person | null
    tasks: TaskItem[]
}

interface Row {
    id: string
    key: string
    type: "project" | "task" | "subtask"
    label: string
    status: string
    priority?: string
    start: string | null
    end: string | null
    progress?: number
    barColor: string
    assignee: Person | null
    projectId: string
    childCount: number
    expanded: boolean
    level: number
}

type Zoom = "week" | "month" | "quarter"

// ─── Constants ────────────────────────────────────────────
const ROW_H = 36
const LABEL_W = 320

const STATUS_COLORS: Record<string, string> = {
    PLANNED: "#3B82F6", ACTIVE: "#F59E0B", COMPLETED: "#10B981", ON_HOLD: "#6B7280",
    TODO: "#94A3B8", NOT_STARTED: "#94A3B8", IN_PROGRESS: "#3B82F6",
    DONE: "#10B981", BLOCKED: "#EF4444", CANCELLED: "#9CA3AF",
}

const PRIORITY_DOT: Record<string, string> = {
    CRITICAL: "#EF4444", HIGH: "#F97316", URGENT: "#F97316",
    MEDIUM: "#EAB308", LOW: "#22C55E",
}

// ─── Helpers ──────────────────────────────────────────────
const sod = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r }
const addD = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
const diffD = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 864e5)
const fmtShort = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
const fmtMonth = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
const inits = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)

// ─── Component ────────────────────────────────────────────
export default function ProjectGantt() {
    const [data, setData] = useState<ProjectItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [expProjects, setExpProjects] = useState<Set<string>>(new Set())
    const [expTasks, setExpTasks] = useState<Set<string>>(new Set())
    const [zoom, setZoom] = useState<Zoom>("month")
    const [allExpanded, setAllExpanded] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Modal state
    const [editProject, setEditProject] = useState<Record<string, unknown> | null>(null)
    const [editProjectOpen, setEditProjectOpen] = useState(false)
    const [editTaskId, setEditTaskId] = useState<string | null>(null)
    const [editTaskOpen, setEditTaskOpen] = useState(false)
    const [fetchingProject, setFetchingProject] = useState<string | null>(null)

    // Fetch data
    useEffect(() => {
        fetch("/api/projects/gantt")
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((d: ProjectItem[]) => {
                setData(d)
                setExpProjects(new Set(d.map(p => p.id)))
                setLoading(false)
            })
            .catch(() => { setError(true); setLoading(false) })
    }, [])

    // Open project edit modal
    const openProjectEdit = useCallback(async (projectId: string) => {
        setFetchingProject(projectId)
        try {
            const res = await fetch(`/api/projects/${projectId}`)
            if (res.ok) {
                const proj = await res.json()
                setEditProject(proj)
                setEditProjectOpen(true)
            }
        } finally {
            setFetchingProject(null)
        }
    }, [])

    // Open task edit modal
    const openTaskEdit = useCallback((taskId: string) => {
        setEditTaskId(taskId)
        setEditTaskOpen(true)
    }, [])

    // Refresh data after modal edit
    const refreshData = useCallback(() => {
        fetch("/api/projects/gantt")
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((d: ProjectItem[]) => setData(d))
            .catch(() => {})
    }, [])

    // Toggle handlers
    const toggleProject = useCallback((id: string) => {
        setExpProjects(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }, [])

    const toggleTask = useCallback((id: string) => {
        setExpTasks(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }, [])

    const toggleAll = useCallback(() => {
        if (allExpanded) {
            setExpProjects(new Set())
            setExpTasks(new Set())
        } else {
            setExpProjects(new Set(data.map(p => p.id)))
            const taskIds = data.flatMap(p => p.tasks.filter(t => t.subtasks.length > 0).map(t => t.id))
            setExpTasks(new Set(taskIds))
        }
        setAllExpanded(!allExpanded)
    }, [allExpanded, data])

    // Flatten hierarchy into rows
    const rows = useMemo<Row[]>(() => {
        const result: Row[] = []
        for (const p of data) {
            const pExp = expProjects.has(p.id)
            result.push({
                id: p.id, key: `p-${p.id}`, type: "project",
                label: p.name, status: p.status,
                start: p.startDate, end: p.endDate,
                progress: p.progress,
                barColor: p.color || "#3B82F6",
                assignee: p.manager, projectId: p.id,
                childCount: p.tasks.length,
                expanded: pExp, level: 0,
            })
            if (pExp) {
                for (const t of p.tasks) {
                    const tExp = expTasks.has(t.id)
                    result.push({
                        id: t.id, key: `t-${t.id}`, type: "task",
                        label: t.title, status: t.status, priority: t.priority,
                        start: t.startDate, end: t.dueDate,
                        barColor: STATUS_COLORS[t.status] || "#94A3B8",
                        assignee: t.assignee, projectId: p.id,
                        childCount: t.subtasks.length,
                        expanded: tExp, level: 1,
                    })
                    if (tExp) {
                        for (const s of t.subtasks) {
                            result.push({
                                id: s.id, key: `s-${s.id}`, type: "subtask",
                                label: s.title, status: s.status, priority: s.priority,
                                start: s.startDate, end: s.dueDate,
                                barColor: STATUS_COLORS[s.status] || "#94A3B8",
                                assignee: s.assignee, projectId: p.id,
                                childCount: 0, expanded: false, level: 2,
                            })
                        }
                    }
                }
            }
        }
        return result
    }, [data, expProjects, expTasks])

    // Timeline range
    const { tlStart, totalDays } = useMemo(() => {
        const now = new Date()
        let earliest = now, latest = addD(now, 90)
        for (const r of rows) {
            if (r.start) { const d = new Date(r.start); if (d < earliest) earliest = d }
            if (r.end) { const d = new Date(r.end); if (d > latest) latest = d }
        }
        const pad = zoom === "week" ? 5 : zoom === "month" ? 10 : 21
        const s = sod(addD(earliest, -pad))
        const e = sod(addD(latest, pad))
        return { tlStart: s, tlEnd: e, totalDays: Math.max(diffD(s, e), 14) }
    }, [rows, zoom])

    const dayW = zoom === "week" ? 36 : zoom === "month" ? 20 : 6
    const totalW = totalDays * dayW

    // Column headers
    const headers = useMemo(() => {
        const cols: { label: string; width: number; isToday: boolean }[] = []
        const today = sod(new Date())
        const tlEnd = addD(tlStart, totalDays)

        if (zoom === "week") {
            for (let i = 0; i < totalDays; i++) {
                const d = addD(tlStart, i)
                const isTd = d.getTime() === today.getTime()
                const isWk = d.getDay() === 1
                cols.push({ label: isWk || i === 0 ? fmtShort(d) : String(d.getDate()), width: dayW, isToday: isTd })
            }
        } else if (zoom === "month") {
            let cur = new Date(tlStart)
            while (cur < tlEnd) {
                const wkEnd = addD(cur, 6)
                const daysInWk = Math.min(diffD(cur, tlEnd), 7)
                const w = daysInWk * dayW
                const isTd = today >= cur && today <= wkEnd
                cols.push({ label: fmtShort(cur), width: w, isToday: isTd })
                cur = addD(cur, 7)
            }
        } else {
            let cur = new Date(tlStart)
            while (cur < tlEnd) {
                const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
                const daysInM = Math.min(diffD(cur, mEnd) + 1, diffD(cur, tlEnd))
                const w = daysInM * dayW
                const isTd = today.getMonth() === cur.getMonth() && today.getFullYear() === cur.getFullYear()
                cols.push({ label: fmtMonth(cur), width: w, isToday: isTd })
                cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
            }
        }
        return cols
    }, [tlStart, totalDays, dayW, zoom])

    // Today marker
    const todayPx = useMemo(() => {
        const days = diffD(tlStart, sod(new Date()))
        return days >= 0 && days <= totalDays ? days * dayW : null
    }, [tlStart, totalDays, dayW])

    // Scroll to today on initial load
    useEffect(() => {
        if (scrollRef.current && todayPx !== null && !loading) {
            const vis = scrollRef.current.clientWidth - LABEL_W
            scrollRef.current.scrollLeft = Math.max(0, todayPx - vis / 3)
        }
    }, [todayPx, loading])

    // Bar position calculator
    function barPos(start: string | null, end: string | null) {
        const s = start ? sod(new Date(start)) : null
        const e = end ? sod(new Date(end)) : null
        if (!s && !e) return null
        const from = s || e!
        const to = e || addD(from, 1)
        const dur = Math.max(diffD(from, to), 1)
        return { left: diffD(tlStart, from) * dayW, width: Math.max(dur * dayW, dayW) }
    }

    // Stats
    const totalTasks = data.reduce((s, p) => s + p.tasks.length, 0)
    const totalSubs = data.reduce((s, p) => s + p.tasks.reduce((ss, t) => ss + t.subtasks.length, 0), 0)

    // ─── Loading skeleton ─────────────────────────────────
    if (loading) {
        return (
            <div className="border rounded-xl overflow-hidden bg-card" style={{ height: "calc(100vh - 240px)" }}>
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <div className="flex gap-2">
                        <div className="h-7 w-14 bg-muted rounded animate-pulse" />
                        <div className="h-7 w-14 bg-muted rounded animate-pulse" />
                        <div className="h-7 w-16 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex">
                    <div className="w-[320px] border-r">
                        {Array.from({ length: 14 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 border-b" style={{ height: 36 }}>
                                <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                                <div className="h-3 bg-muted rounded animate-pulse" style={{ width: `${50 + (i % 3) * 40}px` }} />
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="border rounded-xl bg-card flex flex-col items-center justify-center py-16">
                <p className="text-sm text-destructive">Failed to load Gantt data</p>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="border rounded-xl bg-card flex flex-col items-center justify-center py-16">
                <GanttIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold">No projects</p>
                <p className="text-xs text-muted-foreground mt-1">Create projects with dates to see the Gantt chart</p>
            </div>
        )
    }

    return (
        <div className="border rounded-xl overflow-hidden bg-card flex flex-col" style={{ height: "calc(100vh - 240px)" }}>
            {/* ─── Toolbar ──────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20 shrink-0">
                <div className="flex items-center gap-1.5">
                    {(["week", "month", "quarter"] as Zoom[]).map(z => (
                        <Button
                            key={z}
                            variant={zoom === z ? "default" : "ghost"}
                            size="sm"
                            className="h-7 text-xs capitalize"
                            onClick={() => setZoom(z)}
                        >
                            {z}
                        </Button>
                    ))}
                    <div className="w-px h-5 bg-border mx-1" />
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={toggleAll}>
                        <ChevronsUpDown className="w-3.5 h-3.5" />
                        {allExpanded ? "Collapse" : "Expand"}
                    </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                    {data.length} projects · {totalTasks} tasks · {totalSubs} subtasks
                </span>
            </div>

            {/* ─── Scrollable area ──────────────────────── */}
            <div className="flex-1 overflow-auto" ref={scrollRef}>
                <div style={{ minWidth: LABEL_W + totalW }}>
                    {/* Timeline header row */}
                    <div className="flex sticky top-0 z-20 bg-card border-b">
                        <div
                            className="sticky left-0 z-30 flex items-center px-4 text-xs font-semibold text-muted-foreground bg-card border-r shrink-0"
                            style={{ width: LABEL_W, height: ROW_H }}
                        >
                            Name
                        </div>
                        <div className="flex">
                            {headers.map((h, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "shrink-0 flex items-center justify-center text-[10px] font-medium border-r text-muted-foreground",
                                        h.isToday && "bg-primary/10 text-primary font-semibold"
                                    )}
                                    style={{ width: h.width, height: ROW_H }}
                                >
                                    {h.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Data rows */}
                    {rows.map(row => {
                        const bar = barPos(row.start, row.end)
                        const isProject = row.type === "project"
                        const isTask = row.type === "task"
                        const hasKids = row.childCount > 0

                        return (
                            <div key={row.key} className="flex group/row hover:bg-muted/30 transition-colors" style={{ height: ROW_H }}>
                                {/* ─── Label cell (sticky) ── */}
                                <div
                                    className={cn(
                                        "sticky left-0 z-10 bg-card group-hover/row:bg-muted/30 border-r border-b shrink-0 flex items-center gap-1.5 pr-2 transition-colors",
                                        isProject && "bg-muted/[0.08]"
                                    )}
                                    style={{ width: LABEL_W, paddingLeft: 12 + row.level * 20 }}
                                >
                                    {/* Expand/collapse toggle */}
                                    {hasKids ? (
                                        <button
                                            onClick={() => isProject ? toggleProject(row.id) : toggleTask(row.id)}
                                            className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                                        >
                                            {row.expanded
                                                ? <ChevronDown className="w-3.5 h-3.5" />
                                                : <ChevronRight className="w-3.5 h-3.5" />}
                                        </button>
                                    ) : (
                                        <span className="w-4 shrink-0" />
                                    )}

                                    {/* Color / priority indicator */}
                                    {isProject ? (
                                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: row.barColor }} />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT[row.priority || ""] || "#94A3B8" }} />
                                    )}

                                    {/* Name */}
                                    <span className={cn(
                                        "text-xs truncate flex-1 select-none",
                                        isProject && "font-semibold text-[13px]",
                                        row.status === "DONE" && "line-through text-muted-foreground",
                                        row.status === "CANCELLED" && "line-through text-muted-foreground/60",
                                    )}>
                                        {row.label}
                                    </span>

                                    {/* Collapsed child count */}
                                    {hasKids && !row.expanded && (
                                        <span className="text-[9px] text-muted-foreground/50 shrink-0 tabular-nums">
                                            {row.childCount}
                                        </span>
                                    )}

                                    {/* Assignee avatar */}
                                    {row.assignee && (
                                        <Avatar className="w-5 h-5 shrink-0">
                                            <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                                                {inits(row.assignee.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}

                                    {/* Edit pencil */}
                                    <button
                                        onClick={e => {
                                            e.stopPropagation()
                                            if (isProject) openProjectEdit(row.id)
                                            else openTaskEdit(row.id)
                                        }}
                                        className="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0"
                                        disabled={fetchingProject === row.id}
                                    >
                                        {fetchingProject === row.id
                                            ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                            : <Pencil className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
                                        }
                                    </button>
                                </div>

                                {/* ─── Timeline cell ──────── */}
                                <div className="relative shrink-0 border-b" style={{ width: totalW, height: ROW_H }}>
                                    {/* Grid lines */}
                                    <div className="absolute inset-0 flex pointer-events-none">
                                        {headers.map((h, i) => (
                                            <div key={i} className="shrink-0 border-r border-dashed border-muted-foreground/[0.06]" style={{ width: h.width }} />
                                        ))}
                                    </div>

                                    {/* Today marker */}
                                    {todayPx !== null && (
                                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/40 pointer-events-none" style={{ left: todayPx }} />
                                    )}

                                    {/* Bar */}
                                    {bar && (
                                        <div
                                            className={cn(
                                                "absolute rounded cursor-pointer transition-all",
                                                "hover:brightness-110 hover:shadow-sm",
                                                isProject ? "top-[7px] h-[22px] rounded-[4px]" : isTask ? "top-[9px] h-[18px] rounded-[3px]" : "top-[11px] h-[14px] rounded-[3px]"
                                            )}
                                            style={{
                                                left: bar.left,
                                                width: Math.max(bar.width, 16),
                                                backgroundColor: row.barColor,
                                                opacity: isProject ? 0.8 : 0.65,
                                            }}
                                            title={`${row.label}\n${row.start ? new Date(row.start).toLocaleDateString() : "No start"} → ${row.end ? new Date(row.end).toLocaleDateString() : "No end"}`}
                                        >
                                            {/* Progress overlay for projects */}
                                            {isProject && row.progress !== undefined && row.progress > 0 && (
                                                <div
                                                    className="absolute inset-y-0 left-0 rounded-l bg-white/25"
                                                    style={{ width: `${Math.min(row.progress, 100)}%` }}
                                                />
                                            )}
                                            {/* Label inside bar if wide enough */}
                                            {bar.width > 60 && (
                                                <span className="absolute inset-0 flex items-center px-1.5 text-[9px] font-medium text-white truncate drop-shadow-sm">
                                                    {isProject ? `${row.progress || 0}%` : row.label}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* No dates indicator */}
                                    {!bar && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <Minus className="w-3 h-3 text-muted-foreground/15" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ─── Legend ────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-2 border-t bg-muted/10 shrink-0 text-[10px] text-muted-foreground flex-wrap">
                <span className="font-medium text-foreground/60">Project:</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#3B82F6" }} /> Planned</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#F59E0B" }} /> Active</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#10B981" }} /> Completed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#6B7280" }} /> On Hold</span>
                <span className="w-px h-3 bg-border mx-0.5" />
                <span className="font-medium text-foreground/60">Task:</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#94A3B8" }} /> To Do</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#3B82F6" }} /> In Progress</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#10B981" }} /> Done</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#EF4444" }} /> Blocked</span>
                <span className="w-px h-3 bg-border mx-0.5" />
                <span className="font-medium text-foreground/60">Priority:</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#EF4444" }} /> Critical</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#F97316" }} /> High</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#EAB308" }} /> Medium</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#22C55E" }} /> Low</span>
            </div>

            {/* ─── Modals ───────────────────────────────── */}
            <ProjectEditModal
                project={editProject as never}
                open={editProjectOpen}
                onOpenChange={setEditProjectOpen}
                onProjectUpdated={refreshData}
            />
            <TaskDetailModal
                taskId={editTaskId}
                open={editTaskOpen}
                onOpenChange={setEditTaskOpen}
                onTaskUpdated={refreshData}
            />
        </div>
    )
}
