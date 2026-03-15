"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    CheckSquare, Calendar, Plus, Loader2,
    CheckCircle2, Circle, Star, Trash2, CloudOff, RefreshCw, X,
    Search, ChevronsUpDown, Pencil, ChevronRight, ChevronDown,
} from "lucide-react"
import { cn, formatDate, getInitials } from "@/lib/utils"
import { TASK_STATUS_LABELS } from "@/lib/constants"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
interface SubtaskItem {
    id: string; title: string; status: string; priority: string
    startDate: string | null; dueDate: string | null
    assignee: { id: string; name: string; avatar: string | null } | null
    _count: { subtasks: number; comments: number; files: number }
    subtasks?: SubtaskItem[]
}

interface HierarchyTask {
    id: string; title: string; status: string; priority: string
    startDate: string | null; dueDate: string | null
    project: { id: string; name: string; color: string | null }
    assignee: { id: string; name: string; avatar: string | null } | null
    _count: { subtasks: number; comments: number; files: number }
    subtasks: SubtaskItem[]
}

interface TeamMember { id: string; name: string; email?: string; avatar?: string | null }
interface SimpleProject { id: string; name: string; color: string | null }

interface MsTask {
    id: string; title: string; status: string; importance: string
    body?: { content: string; contentType: string }
    dueDateTime?: { dateTime: string; timeZone: string }
    createdDateTime: string; completedDateTime?: { dateTime: string; timeZone: string }
}

interface MsTaskList { id: string; displayName: string; wellknownListName?: string }

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function calcDuration(start: string | null, end: string | null): string {
    if (!start || !end) return "—"
    const s = new Date(start), e = new Date(end)
    const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 864e5))
    return `${days}d`
}

function calcProgress(task: HierarchyTask | SubtaskItem): number {
    const subs = task.subtasks || []
    if (subs.length === 0) {
        if (task.status === "DONE" || task.status === "COMPLETED") return 100
        if (task.status === "IN_PROGRESS") return 50
        return 0
    }
    const done = subs.filter(s => s.status === "DONE" || s.status === "COMPLETED").length
    return Math.round((done / subs.length) * 100)
}

function getStatusLabel(status: string): string {
    return TASK_STATUS_LABELS[status] || status.replace(/_/g, " ")
}

function getStatusBadgeColor(status: string): string {
    switch (status) {
        case "IN_PROGRESS": return "bg-blue-500/15 text-blue-400 border-blue-500/30"
        case "DONE": case "COMPLETED": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        case "BLOCKED": return "bg-red-500/15 text-red-400 border-red-500/30"
        case "CANCELLED": return "bg-gray-500/15 text-gray-400 border-gray-500/30"
        case "PLANNED": case "NOT_STARTED": case "TODO": return "bg-slate-500/15 text-slate-400 border-slate-500/30"
        default: return "bg-muted text-muted-foreground"
    }
}

// ═══════════════════════════════════════
// EDIT TASK MODAL
// ═══════════════════════════════════════
function EditTaskModal({ taskId, open, onClose, teamMembers, onUpdated }: {
    taskId: string | null; open: boolean; onClose: () => void
    teamMembers: TeamMember[]; onUpdated: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

    const [title, setTitle] = useState("")
    const [priority, setPriority] = useState("MEDIUM")
    const [status, setStatus] = useState("TODO")
    const [startDate, setStartDate] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [assigneeId, setAssigneeId] = useState("")
    const [progress, setProgress] = useState("0")
    const [dependency, setDependency] = useState("")

    useEffect(() => {
        if (!taskId || !open) return
        setLoading(true)
        fetch(`/api/tasks/${taskId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setTitle(data.title || "")
                    setPriority(data.priority || "MEDIUM")
                    setStatus(data.status || "TODO")
                    setStartDate(data.startDate ? data.startDate.split("T")[0] : "")
                    setDueDate(data.dueDate ? data.dueDate.split("T")[0] : "")
                    setAssigneeId(data.assignee?.id || "")
                    // Calculate progress from subtasks
                    const subs = data.subtasks || []
                    if (subs.length > 0) {
                        const done = subs.filter((s: { status: string }) => s.status === "DONE").length
                        setProgress(String(Math.round((done / subs.length) * 100)))
                    } else {
                        setProgress(data.status === "DONE" ? "100" : data.status === "IN_PROGRESS" ? "50" : "0")
                    }
                    setDependency("")
                }
            })
            .finally(() => setLoading(false))
    }, [taskId, open])

    const handleSave = async () => {
        if (!taskId) return
        setSaving(true)
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    priority, status,
                    startDate: startDate ? new Date(startDate).toISOString() : null,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                    assigneeId: assigneeId || null,
                }),
            })
            if (res.ok) { onUpdated(); onClose() }
        } finally { setSaving(false) }
    }

    const handleDelete = async () => {
        if (!taskId) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
            if (res.ok) { onUpdated(); onClose() }
        } finally { setDeleting(false); setDeleteConfirmOpen(false) }
    }

    if (!open) return null

    return (
        <>
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg">
                <Card className="p-6 shadow-2xl border">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold">Edit Task</h3>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-5">Update task details</p>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Task Name</label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)}
                                    className="h-10 text-sm border-primary/50 focus:border-primary" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Priority</label>
                                    <Select value={priority} onValueChange={setPriority}>
                                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HIGH">High</SelectItem>
                                            <SelectItem value="URGENT">Urgent</SelectItem>
                                            <SelectItem value="CRITICAL">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Status</label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                                            <SelectItem value="TODO">To Do</SelectItem>
                                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                            <SelectItem value="BLOCKED">Blocked</SelectItem>
                                            <SelectItem value="DONE">Done</SelectItem>
                                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Start Date</label>
                                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">End Date</label>
                                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Assigned To</label>
                                    <Select value={assigneeId || "unassigned"} onValueChange={(v) => setAssigneeId(v === "unassigned" ? "" : v)}>
                                        <SelectTrigger className="h-10"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Progress (%)</label>
                                    <Input type="number" min="0" max="100" value={progress}
                                        onChange={(e) => setProgress(e.target.value)} className="h-10" disabled />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Dependency</label>
                                <Input placeholder="e.g. T001" value={dependency}
                                    onChange={(e) => setDependency(e.target.value)} className="h-10" disabled />
                            </div>

                            <div className="flex items-center justify-between pt-3">
                                <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} disabled={deleting}>
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                                    <Button size="sm" className="gradient-primary text-white" onClick={handleSave}
                                        disabled={saving || !title.trim()}>
                                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            <ConfirmDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}
                title="Delete Task" description={`Delete "${title}"? This action cannot be undone.`}
                confirmLabel="Delete" variant="destructive" onConfirm={handleDelete} />
        </>
    )
}


// ═══════════════════════════════════════
// HIERARCHICAL TABLE ROW
// ═══════════════════════════════════════
function TaskRow({ task, level, expanded, onToggle, onEdit, teamMembers }: {
    task: HierarchyTask | SubtaskItem
    level: number
    expanded: Set<string>
    onToggle: (id: string) => void
    onEdit: (id: string) => void
    teamMembers: TeamMember[]
}) {
    const isExpanded = expanded.has(task.id)
    const hasChildren = (task.subtasks?.length || 0) > 0
    const progress = calcProgress(task)
    const startDate = task.startDate
    const endDate = task.dueDate
    const duration = calcDuration(startDate, endDate)
    const isParent = level === 0

    return (
        <>
            <tr className={cn(
                "group/row hover:bg-muted/30 transition-colors border-b border-border/30",
                isParent && "bg-muted/[0.06]"
            )}>
                {/* TASK NAME */}
                <td className="py-3 pr-3" style={{ paddingLeft: `${16 + level * 28}px` }}>
                    <div className="flex items-center gap-2">
                        {hasChildren ? (
                            <button onClick={() => onToggle(task.id)} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 rounded hover:bg-muted">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        ) : (
                            <span className="w-5 shrink-0" />
                        )}
                        <span className={cn(
                            "text-sm truncate",
                            isParent ? "font-semibold" : "font-normal",
                            (task.status === "DONE" || task.status === "CANCELLED") && "line-through text-muted-foreground"
                        )}>
                            {task.title}
                        </span>
                    </div>
                </td>

                {/* START */}
                <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                    {startDate ? formatDate(startDate) : "—"}
                </td>

                {/* END */}
                <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                    {endDate ? formatDate(endDate) : "—"}
                </td>

                {/* DURATION */}
                <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                    {duration}
                </td>

                {/* ASSIGNED TO */}
                <td className="py-3 px-3">
                    {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                            <Avatar className="w-5 h-5">
                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                    {getInitials(task.assignee.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate max-w-[100px]">{task.assignee.name}</span>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    )}
                </td>

                {/* PROGRESS */}
                <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-2.5 rounded-full bg-muted overflow-hidden shrink-0">
                            <div className="h-full rounded-full transition-all duration-300"
                                style={{
                                    width: `${progress}%`,
                                    backgroundColor: progress >= 100 ? "#10B981" : progress >= 50 ? "#3B82F6" : progress > 0 ? "#F59E0B" : "#6B7280",
                                }} />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-8">{progress}%</span>
                    </div>
                </td>

                {/* STATUS */}
                <td className="py-3 px-3">
                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-medium", getStatusBadgeColor(task.status))}>
                        {getStatusLabel(task.status)}
                    </Badge>
                </td>

                {/* ACTIONS */}
                <td className="py-3 px-3 text-right">
                    <button
                        onClick={() => onEdit(task.id)}
                        className="opacity-0 group-hover/row:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                </td>
            </tr>

            {/* Render children */}
            {isExpanded && task.subtasks?.map(sub => (
                <TaskRow
                    key={sub.id}
                    task={sub as HierarchyTask}
                    level={level + 1}
                    expanded={expanded}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    teamMembers={teamMembers}
                />
            ))}
        </>
    )
}


// ═══════════════════════════════════════
// MAIN TASKS PAGE
// ═══════════════════════════════════════
export default function TasksPage() {
    useSession()
    const [tasks, setTasks] = useState<HierarchyTask[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    // Edit modal
    const [editTaskId, setEditTaskId] = useState<string | null>(null)
    const [editModalOpen, setEditModalOpen] = useState(false)

    // New task
    const [showNewTask, setShowNewTask] = useState(false)
    const [projectsList, setProjectsList] = useState<SimpleProject[]>([])
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [ptProjectId, setPtProjectId] = useState("")
    const [ptTitle, setPtTitle] = useState("")
    const [ptDue, setPtDue] = useState("")
    const [ptStartDate, setPtStartDate] = useState("")
    const [ptPriority, setPtPriority] = useState("MEDIUM")
    const [ptAssigneeId, setPtAssigneeId] = useState("")
    const [ptCreating, setPtCreating] = useState(false)

    // Microsoft Tasks state
    const [activeTab, setActiveTab] = useState<"project" | "microsoft">("project")
    const [msTasks, setMsTasks] = useState<MsTask[]>([])
    const [msLists, setMsLists] = useState<MsTaskList[]>([])
    const [msActiveListId, setMsActiveListId] = useState<string | null>(null)
    const [msLoading, setMsLoading] = useState(false)
    const [msNeedsAuth, setMsNeedsAuth] = useState(false)
    const [msFilter, setMsFilter] = useState<string>("ALL")
    const [msShowNewTask, setMsShowNewTask] = useState(false)
    const [msNewTitle, setMsNewTitle] = useState("")
    const [msNewDue, setMsNewDue] = useState("")
    const [msNewImportance, setMsNewImportance] = useState("normal")
    const [msCreating, setMsCreating] = useState(false)

    const searchRef = useRef<HTMLInputElement>(null)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const fetchTasks = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (debouncedSearch) params.set("search", debouncedSearch)
            const res = await fetch(`/api/tasks/hierarchy?${params}`)
            if (res.ok) {
                const data: HierarchyTask[] = await res.json()
                setTasks(data)
                // Auto-expand all parent tasks on first load
                if (expanded.size === 0 && data.length > 0) {
                    const ids = new Set<string>()
                    data.forEach(t => { if (t.subtasks?.length) ids.add(t.id) })
                    setExpanded(ids)
                }
            }
        } finally { setLoading(false) }
    }, [debouncedSearch])

    useEffect(() => { fetchTasks() }, [fetchTasks])
    useEffect(() => { fetchProjectsList(); fetchTeamMembers() }, [])

    const fetchTeamMembers = async () => {
        try {
            const res = await fetch("/api/users")
            if (res.ok) setTeamMembers(await res.json())
        } catch { /* silent */ }
    }

    const fetchProjectsList = async () => {
        try {
            const res = await fetch("/api/projects?limit=50")
            if (res.ok) {
                const json = await res.json()
                const data = json.data ?? json
                setProjectsList(data.map((p: SimpleProject) => ({ id: p.id, name: p.name, color: p.color })))
            }
        } catch { /* silent */ }
    }

    const handleToggle = useCallback((id: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }, [])

    const toggleAll = useCallback(() => {
        if (expanded.size > 0) {
            setExpanded(new Set())
        } else {
            const ids = new Set<string>()
            const walk = (items: (HierarchyTask | SubtaskItem)[]) => {
                items.forEach(t => {
                    if (t.subtasks?.length) { ids.add(t.id); walk(t.subtasks) }
                })
            }
            walk(tasks)
            setExpanded(ids)
        }
    }, [expanded, tasks])

    const handleEdit = useCallback((id: string) => {
        setEditTaskId(id)
        setEditModalOpen(true)
    }, [])

    const handleCreateTask = async () => {
        if (!ptTitle.trim() || !ptProjectId) return
        setPtCreating(true)
        try {
            const res = await fetch("/api/tasks", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: ptTitle, projectId: ptProjectId,
                    startDate: ptStartDate || null,
                    dueDate: ptDue || null,
                    priority: ptPriority,
                    assigneeId: ptAssigneeId || undefined,
                }),
            })
            if (res.ok) {
                setPtTitle(""); setPtDue(""); setPtStartDate(""); setPtPriority("MEDIUM"); setPtAssigneeId("")
                setShowNewTask(false); fetchTasks()
            }
        } finally { setPtCreating(false) }
    }

    // MS To Do handlers
    const fetchMsTasks = useCallback(async (listId?: string) => {
        setMsLoading(true)
        try {
            let url = "/api/tasks/microsoft"
            if (listId) url += `?listId=${listId}`
            const res = await fetch(url)
            if (res.status === 403) { setMsNeedsAuth(true); return }
            if (res.ok) {
                const data = await res.json()
                if (data.lists) setMsLists(data.lists)
                if (data.defaultListId && !msActiveListId) setMsActiveListId(data.defaultListId)
                setMsTasks(data.tasks || []); setMsNeedsAuth(false)
            }
        } finally { setMsLoading(false) }
    }, [msActiveListId])

    useEffect(() => {
        if (activeTab === "microsoft") fetchMsTasks(msActiveListId || undefined)
    }, [activeTab, msActiveListId, fetchMsTasks])

    const handleCreateMsTask = async () => {
        if (!msNewTitle.trim()) return
        setMsCreating(true)
        try {
            const res = await fetch("/api/tasks/microsoft", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId: msActiveListId, title: msNewTitle, dueDate: msNewDue || undefined, importance: msNewImportance }),
            })
            if (res.ok) {
                setMsNewTitle(""); setMsNewDue(""); setMsNewImportance("normal")
                setMsShowNewTask(false); fetchMsTasks(msActiveListId || undefined)
            }
        } finally { setMsCreating(false) }
    }

    const toggleMsTaskComplete = async (task: MsTask) => {
        const newStatus = task.status === "completed" ? "notStarted" : "completed"
        try {
            await fetch("/api/tasks/microsoft", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId: msActiveListId, taskId: task.id, status: newStatus }),
            })
            setMsTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
        } catch { /* silent */ }
    }

    const deleteMsTask = async (taskId: string) => {
        try {
            await fetch(`/api/tasks/microsoft?listId=${msActiveListId}&taskId=${taskId}`, { method: "DELETE" })
            setMsTasks(prev => prev.filter(t => t.id !== taskId))
        } catch { /* silent */ }
    }

    const msFiltered = msFilter === "ALL" ? msTasks :
        msFilter === "completed" ? msTasks.filter(t => t.status === "completed") :
        msTasks.filter(t => t.status !== "completed")

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                if (e.key === "Escape") {
                    ;(e.target as HTMLElement).blur()
                    setShowNewTask(false); setMsShowNewTask(false)
                }
                return
            }
            if (e.key === "n" || e.key === "N") { e.preventDefault(); if (activeTab === "project") setShowNewTask(true); else setMsShowNewTask(true) }
            if (e.key === "/") { e.preventDefault(); searchRef.current?.focus() }
            if (e.key === "Escape") { setShowNewTask(false); setMsShowNewTask(false); setEditModalOpen(false) }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [activeTab])

    // Loading skeleton
    if (loading) {
        return (
            <div className="animate-in fade-in duration-300">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-40 bg-muted rounded animate-pulse" />
                </div>
                <div className="border rounded-xl overflow-hidden bg-card">
                    <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
                        <div className="h-8 w-56 bg-muted rounded animate-pulse" />
                        <div className="flex-1" />
                        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                    </div>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 border-b" style={{ height: 48 }}>
                            <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${120 + (i % 3) * 60}px`, marginLeft: `${(i % 3) * 28}px` }} />
                            <div className="flex-1" />
                            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                            <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-300">
            {/* Compact Header */}
            <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-bold tracking-tight shrink-0">Tasks</h2>
                <p className="text-xs text-muted-foreground hidden sm:block">Hierarchical task management</p>
                <div className="flex gap-0.5 bg-muted/50 p-0.5 rounded-md ml-2">
                    <button onClick={() => setActiveTab("project")}
                        className={cn("px-3 py-1 rounded text-[11px] font-medium transition-all",
                            activeTab === "project" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        <CheckSquare className="w-3 h-3 inline mr-1" />Project
                    </button>
                    <button onClick={() => setActiveTab("microsoft")}
                        className={cn("px-3 py-1 rounded text-[11px] font-medium transition-all",
                            activeTab === "microsoft" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        <svg className="w-3 h-3 inline mr-1" viewBox="0 0 21 21" fill="none">
                            <rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                        </svg>
                        MS To Do
                    </button>
                </div>
                <div className="flex-1" />
                {activeTab === "project" && (
                    <Button size="sm" className="gradient-primary text-white h-8 text-xs" onClick={() => setShowNewTask(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> New Task
                    </Button>
                )}
            </div>

            {activeTab === "project" ? (
                <>
                    {/* Create form */}
                    {showNewTask && (
                        <Card className="p-4 space-y-3 border-primary/20 mb-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">New Task</h3>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewTask(false)}><X className="w-3.5 h-3.5" /></Button>
                            </div>
                            <Input placeholder="Task title..." value={ptTitle} onChange={(e) => setPtTitle(e.target.value)} className="h-9 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateTask()} />
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                <select value={ptProjectId} onChange={(e) => setPtProjectId(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs">
                                    <option value="">Select project...</option>
                                    {projectsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <select value={ptAssigneeId} onChange={(e) => setPtAssigneeId(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs">
                                    <option value="">Assign to...</option>
                                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <Input type="date" value={ptStartDate} onChange={(e) => setPtStartDate(e.target.value)} className="h-9 text-xs" placeholder="Start" />
                                <Input type="date" value={ptDue} onChange={(e) => setPtDue(e.target.value)} className="h-9 text-xs" placeholder="Due" />
                                <select value={ptPriority} onChange={(e) => setPtPriority(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs">
                                    <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option><option value="URGENT">Urgent</option><option value="CRITICAL">Critical</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewTask(false)}>Cancel</Button>
                                <Button size="sm" className="h-8 text-xs gradient-primary text-white" onClick={handleCreateTask} disabled={ptCreating || !ptTitle.trim() || !ptProjectId}>
                                    {ptCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Create
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Search + Controls */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                ref={searchRef}
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-sm bg-muted/50 border-0"
                            />
                        </div>
                        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={toggleAll}>
                            <ChevronsUpDown className="w-3.5 h-3.5" />
                            {expanded.size > 0 ? "Collapse" : "Expand All"}
                        </Button>
                    </div>

                    {/* Hierarchical Table */}
                    <div className="border rounded-xl bg-card overflow-hidden" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
                        <div className="overflow-auto h-full">
                            <table className="w-full min-w-[900px]">
                                <thead className="sticky top-0 z-10 bg-card">
                                    <tr className="border-b bg-muted/20">
                                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 pl-4 pr-3 w-[30%]">Task Name</th>
                                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Start</th>
                                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">End</th>
                                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Duration</th>
                                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Assigned To</th>
                                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Progress</th>
                                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Status</th>
                                        <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3 w-16">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.length > 0 ? tasks.map(task => (
                                        <TaskRow
                                            key={task.id}
                                            task={task}
                                            level={0}
                                            expanded={expanded}
                                            onToggle={handleToggle}
                                            onEdit={handleEdit}
                                            teamMembers={teamMembers}
                                        />
                                    )) : (
                                        <tr>
                                            <td colSpan={8} className="text-center py-16">
                                                <CheckSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                                                <h3 className="text-sm font-semibold mb-1">No tasks found</h3>
                                                <p className="text-xs text-muted-foreground mb-3">Create your first task to get started</p>
                                                <Button size="sm" className="gradient-primary text-white" onClick={() => setShowNewTask(true)}>
                                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Task
                                                </Button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Edit Modal */}
                    <EditTaskModal
                        taskId={editTaskId}
                        open={editModalOpen}
                        onClose={() => { setEditModalOpen(false); setEditTaskId(null) }}
                        teamMembers={teamMembers}
                        onUpdated={fetchTasks}
                    />
                </>
            ) : (
                /* MICROSOFT TO DO TAB */
                <>
                    {msNeedsAuth ? (
                        <Card className="border-dashed">
                            <div className="py-12 md:py-16 text-center">
                                <CloudOff className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                <h3 className="text-base font-semibold mb-1">Connect Microsoft To Do</h3>
                                <p className="text-sm text-muted-foreground mb-4">Sign in again to grant access to your Microsoft Tasks</p>
                                <Button className="gradient-primary text-white" onClick={() => window.location.href = "/login"}>Re-sign in</Button>
                            </div>
                        </Card>
                    ) : (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <div className="flex gap-1.5 overflow-x-auto pb-1">
                                    {msLists.map((list) => (
                                        <button key={list.id} onClick={() => setMsActiveListId(list.id)}
                                            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                                                msActiveListId === list.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                                            {list.displayName}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="flex gap-1 bg-muted/50 p-0.5 rounded-md">
                                        {[{ id: "ALL", label: "All" }, { id: "active", label: "Active" }, { id: "completed", label: "Done" }].map(f => (
                                            <button key={f.id} onClick={() => setMsFilter(f.id)}
                                                className={cn("px-2 py-1 rounded text-[10px] font-medium transition-all",
                                                    msFilter === f.id ? "bg-background shadow-sm" : "text-muted-foreground")}>
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fetchMsTasks(msActiveListId || undefined)} disabled={msLoading}>
                                        <RefreshCw className={cn("w-3.5 h-3.5", msLoading && "animate-spin")} />
                                    </Button>
                                    <Button size="sm" className="h-8 text-xs" onClick={() => setMsShowNewTask(true)}>
                                        <Plus className="w-3.5 h-3.5 mr-1" /><span className="hidden sm:inline">New Task</span>
                                    </Button>
                                </div>
                            </div>

                            {msShowNewTask && (
                                <Card className="p-3 md:p-4 space-y-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">New Task</h3>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMsShowNewTask(false)}><X className="w-3.5 h-3.5" /></Button>
                                    </div>
                                    <Input placeholder="Task title..." value={msNewTitle} onChange={(e) => setMsNewTitle(e.target.value)}
                                        className="h-9 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateMsTask()} />
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input type="date" value={msNewDue} onChange={(e) => setMsNewDue(e.target.value)} className="h-8 text-xs flex-1" />
                                        <select value={msNewImportance} onChange={(e) => setMsNewImportance(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs flex-1">
                                            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setMsShowNewTask(false)}>Cancel</Button>
                                        <Button size="sm" className="h-8 text-xs" onClick={handleCreateMsTask} disabled={msCreating || !msNewTitle.trim()}>
                                            {msCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Create
                                        </Button>
                                    </div>
                                </Card>
                            )}

                            {msLoading ? (
                                <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                            ) : (
                                <Card>
                                    <div className="divide-y divide-border/50">
                                        {msFiltered.map((task) => (
                                            <div key={task.id} className="flex items-center gap-3 p-3 md:p-4 hover:bg-muted/50 transition-colors group">
                                                <button onClick={() => toggleMsTaskComplete(task)} className="shrink-0">
                                                    {task.status === "completed"
                                                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                        : <Circle className="w-5 h-5 text-muted-foreground/40 hover:text-primary transition-colors" />}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-sm font-medium truncate", task.status === "completed" && "line-through text-muted-foreground")}>{task.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {task.dueDateTime && (
                                                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                <Calendar className="w-2.5 h-2.5" /> {new Date(task.dueDateTime.dateTime).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {task.body?.content && <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{task.body.content}</span>}
                                                    </div>
                                                </div>
                                                {task.importance === "high" && <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />}
                                                <Badge className={cn("text-[10px] shrink-0 hidden sm:inline-flex",
                                                    task.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                                                    task.status === "inProgress" ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground")}>
                                                    {task.status === "completed" ? "Done" : task.status === "inProgress" ? "Active" : "To Do"}
                                                </Badge>
                                                <Button variant="ghost" size="icon"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive"
                                                    onClick={() => deleteMsTask(task.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {!msLoading && msFiltered.length === 0 && (
                                <div className="text-center py-12">
                                    <CheckSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <h3 className="text-base font-semibold mb-1">No tasks</h3>
                                    <p className="text-sm text-muted-foreground">{msFilter !== "ALL" ? "Try a different filter" : "Create a task to get started"}</p>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    )
}
