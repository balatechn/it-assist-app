"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    CheckSquare, Calendar, MessageSquare, Plus, Loader2,
    CheckCircle2, Circle, Star, Trash2, CloudOff, RefreshCw, X,
} from "lucide-react"
import { cn, formatDate, getInitials, getStatusColor, getPriorityColor } from "@/lib/utils"
import { TaskDetailModal } from "@/components/task-detail-modal"

interface Task {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    dueDate: string | null
    project: { id: string; name: string; color: string | null }
    assignee: { id: string; name: string } | null
    _count: { comments: number; files: number }
}

interface MsTask {
    id: string
    title: string
    status: string // "notStarted" | "inProgress" | "completed"
    importance: string // "low" | "normal" | "high"
    body?: { content: string; contentType: string }
    dueDateTime?: { dateTime: string; timeZone: string }
    createdDateTime: string
    completedDateTime?: { dateTime: string; timeZone: string }
}

interface MsTaskList {
    id: string
    displayName: string
    wellknownListName?: string
}

interface SimpleProject {
    id: string
    name: string
    color: string | null
}

export default function TasksPage() {
    useSession()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>("ALL")
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    // Project task create
    const [showProjectTaskCreate, setShowProjectTaskCreate] = useState(false)
    const [projectsList, setProjectsList] = useState<SimpleProject[]>([])
    const [ptProjectId, setPtProjectId] = useState("")
    const [ptTitle, setPtTitle] = useState("")
    const [ptDue, setPtDue] = useState("")
    const [ptPriority, setPtPriority] = useState("MEDIUM")
    const [ptCreating, setPtCreating] = useState(false)

    // Microsoft Tasks state
    const [activeTab, setActiveTab] = useState<"project" | "microsoft">("project")
    const [msTasks, setMsTasks] = useState<MsTask[]>([])
    const [msLists, setMsLists] = useState<MsTaskList[]>([])
    const [msActiveListId, setMsActiveListId] = useState<string | null>(null)
    const [msLoading, setMsLoading] = useState(false)
    const [msNeedsAuth, setMsNeedsAuth] = useState(false)
    const [msFilter, setMsFilter] = useState<string>("ALL")

    // New task form
    const [showNewTask, setShowNewTask] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState("")
    const [newTaskDue, setNewTaskDue] = useState("")
    const [newTaskImportance, setNewTaskImportance] = useState("normal")
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        fetchTasks()
        fetchProjectsList()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

    const fetchProjectsList = async () => {
        try {
            const res = await fetch("/api/projects?limit=50")
            if (res.ok) {
                const json = await res.json()
                const data = json.data ?? json
                setProjectsList(data.map((p: { id: string; name: string; color: string | null }) => ({ id: p.id, name: p.name, color: p.color })))
            }
        } catch { /* silent */ }
    }

    const handleCreateProjectTask = async () => {
        if (!ptTitle.trim() || !ptProjectId) return
        setPtCreating(true)
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: ptTitle,
                    projectId: ptProjectId,
                    dueDate: ptDue || null,
                    priority: ptPriority,
                }),
            })
            if (res.ok) {
                setPtTitle("")
                setPtDue("")
                setPtPriority("MEDIUM")
                setShowProjectTaskCreate(false)
                fetchTasks()
            }
        } catch { /* silent */ }
        finally { setPtCreating(false) }
    }

    const fetchTasks = async () => {
        try {
            const res = await fetch(`/api/tasks?page=${page}&limit=20`)
            if (res.ok) {
                const json = await res.json()
                setTasks(json.data ?? json)
                if (json.pagination) {
                    setTotalPages(json.pagination.totalPages)
                    setTotal(json.pagination.total)
                }
            }
        } finally {
            setLoading(false)
        }
    }

    const fetchMsTasks = useCallback(async (listId?: string) => {
        setMsLoading(true)
        try {
            let url = "/api/tasks/microsoft"
            if (listId) url += `?listId=${listId}`
            const res = await fetch(url)
            if (res.status === 403) {
                setMsNeedsAuth(true)
                return
            }
            if (res.ok) {
                const data = await res.json()
                if (data.lists) setMsLists(data.lists)
                if (data.defaultListId && !msActiveListId) setMsActiveListId(data.defaultListId)
                setMsTasks(data.tasks || [])
                setMsNeedsAuth(false)
            }
        } catch {
            // silent
        } finally {
            setMsLoading(false)
        }
    }, [msActiveListId])

    useEffect(() => {
        if (activeTab === "microsoft") {
            fetchMsTasks(msActiveListId || undefined)
        }
    }, [activeTab, msActiveListId, fetchMsTasks])

    const handleCreateMsTask = async () => {
        if (!newTaskTitle.trim()) return
        setCreating(true)
        try {
            const res = await fetch("/api/tasks/microsoft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    listId: msActiveListId,
                    title: newTaskTitle,
                    dueDate: newTaskDue || undefined,
                    importance: newTaskImportance,
                }),
            })
            if (res.ok) {
                setNewTaskTitle("")
                setNewTaskDue("")
                setNewTaskImportance("normal")
                setShowNewTask(false)
                fetchMsTasks(msActiveListId || undefined)
            }
        } finally {
            setCreating(false)
        }
    }

    const toggleMsTaskComplete = async (task: MsTask) => {
        const newStatus = task.status === "completed" ? "notStarted" : "completed"
        try {
            await fetch("/api/tasks/microsoft", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    listId: msActiveListId,
                    taskId: task.id,
                    status: newStatus,
                }),
            })
            setMsTasks(prev =>
                prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
            )
        } catch { /* silent */ }
    }

    const deleteMsTask = async (taskId: string) => {
        try {
            await fetch(`/api/tasks/microsoft?listId=${msActiveListId}&taskId=${taskId}`, {
                method: "DELETE",
            })
            setMsTasks(prev => prev.filter(t => t.id !== taskId))
        } catch { /* silent */ }
    }

    const filtered = filter === "ALL" ? tasks : tasks.filter(t => t.status === filter)
    const msFiltered = msFilter === "ALL" ? msTasks :
        msFilter === "completed" ? msTasks.filter(t => t.status === "completed") :
        msTasks.filter(t => t.status !== "completed")

    const statusFilters = [
        { id: "ALL", label: "All", count: tasks.length },
        { id: "TODO", label: "To Do", count: tasks.filter(t => t.status === "TODO").length },
        { id: "IN_PROGRESS", label: "Active", count: tasks.filter(t => t.status === "IN_PROGRESS").length },
        { id: "DONE", label: "Done", count: tasks.filter(t => t.status === "DONE").length },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">My Tasks</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Project tasks &amp; Microsoft To Do</p>
                </div>
                {activeTab === "project" && (
                    <Button size="sm" className="gradient-primary text-white" onClick={() => setShowProjectTaskCreate(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        New Task
                    </Button>
                )}
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab("project")}
                    className={cn(
                        "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                        activeTab === "project"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <CheckSquare className="w-3.5 h-3.5 inline mr-1.5" />
                    Project Tasks
                </button>
                <button
                    onClick={() => setActiveTab("microsoft")}
                    className={cn(
                        "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                        activeTab === "microsoft"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <svg className="w-3.5 h-3.5 inline mr-1.5" viewBox="0 0 21 21" fill="none">
                        <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                        <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                        <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                        <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                    </svg>
                    Microsoft To Do
                </button>
            </div>

            {activeTab === "project" ? (
                <>
                    {/* Project Task Create Form */}
                    {showProjectTaskCreate && (
                        <Card className="p-3 md:p-4 space-y-3 border-primary/20">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">New Project Task</h3>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowProjectTaskCreate(false)}>
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            <Input placeholder="Task title..." value={ptTitle} onChange={(e) => setPtTitle(e.target.value)} className="h-9 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateProjectTask()} />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <select value={ptProjectId} onChange={(e) => setPtProjectId(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs">
                                    <option value="">Select project...</option>
                                    {projectsList.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <Input type="date" value={ptDue} onChange={(e) => setPtDue(e.target.value)} className="h-9 text-xs" />
                                <select value={ptPriority} onChange={(e) => setPtPriority(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs">
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowProjectTaskCreate(false)}>Cancel</Button>
                                <Button size="sm" className="h-8 text-xs gradient-primary text-white" onClick={handleCreateProjectTask} disabled={ptCreating || !ptTitle.trim() || !ptProjectId}>
                                    {ptCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                                    Create
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Filters */}
                    <div className="flex gap-1.5 flex-wrap">
                        {statusFilters.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setFilter(s.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                                    filter === s.id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {s.label} ({s.count})
                            </button>
                        ))}
                    </div>

                    {/* Tasks List */}
                    <Card>
                        <div className="divide-y divide-border/50">
                            {filtered.map((task) => (
                                <div key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                                    <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-muted/50 transition-all duration-200 group cursor-pointer">
                                        <div
                                            className="w-1 h-8 md:h-10 rounded-full shrink-0"
                                            style={{ backgroundColor: task.project.color || "#3B82F6" }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                {task.title}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">{task.project.name}</p>
                                        </div>
                                        <Badge className={cn("text-[10px] shrink-0", getPriorityColor(task.priority))}>
                                            {task.priority}
                                        </Badge>
                                        <Badge className={cn("text-[10px] shrink-0 hidden sm:inline-flex", getStatusColor(task.status))}>
                                            {task.status.replace("_", " ")}
                                        </Badge>
                                        {task.dueDate && (
                                            <span className="text-[11px] text-muted-foreground items-center gap-1 shrink-0 hidden md:flex">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(task.dueDate)}
                                            </span>
                                        )}
                                        <div className="items-center gap-2 shrink-0 hidden sm:flex">
                                            {task._count.comments > 0 && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                                    <MessageSquare className="w-3 h-3" /> {task._count.comments}
                                                </span>
                                            )}
                                            {task.assignee && (
                                                <Avatar className="w-6 h-6">
                                                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                        {getInitials(task.assignee.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {filtered.length === 0 && (
                        <div className="text-center py-12 md:py-16">
                            <CheckSquare className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <h3 className="text-base md:text-lg font-semibold mb-1">No tasks found</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {filter !== "ALL" ? "Try adjusting your filter" : "Create your first task to get started"}
                            </p>
                            <Button className="gradient-primary text-white" onClick={() => setShowProjectTaskCreate(true)}>
                                <Plus className="w-4 h-4 mr-2" /> Create Task
                            </Button>
                        </div>
                    )}

                    {/* Task Detail Modal */}
                    <TaskDetailModal
                        taskId={selectedTaskId}
                        open={!!selectedTaskId}
                        onOpenChange={(open) => { if (!open) setSelectedTaskId(null) }}
                        onTaskUpdated={fetchTasks}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-xs md:text-sm text-muted-foreground">
                                Page {page}/{totalPages} ({total} tasks)
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Microsoft To Do Tab */
                <>
                    {msNeedsAuth ? (
                        <Card className="border-dashed">
                            <div className="py-12 md:py-16 text-center">
                                <CloudOff className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                <h3 className="text-base font-semibold mb-1">Connect Microsoft To Do</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Sign in again to grant access to your Microsoft Tasks
                                </p>
                                <Button className="gradient-primary text-white" onClick={() => window.location.href = "/login"}>
                                    Re-sign in
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <>
                            {/* List selector + actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex gap-1.5 overflow-x-auto pb-1">
                                    {msLists.map((list) => (
                                        <button
                                            key={list.id}
                                            onClick={() => setMsActiveListId(list.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                                                msActiveListId === list.id
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            {list.displayName}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {/* Filter */}
                                    <div className="flex gap-1 bg-muted/50 p-0.5 rounded-md">
                                        {[
                                            { id: "ALL", label: "All" },
                                            { id: "active", label: "Active" },
                                            { id: "completed", label: "Done" },
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setMsFilter(f.id)}
                                                className={cn(
                                                    "px-2 py-1 rounded text-[10px] font-medium transition-all",
                                                    msFilter === f.id ? "bg-background shadow-sm" : "text-muted-foreground"
                                                )}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => fetchMsTasks(msActiveListId || undefined)}
                                        disabled={msLoading}
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5", msLoading && "animate-spin")} />
                                    </Button>
                                    <Button size="sm" className="h-8 text-xs" onClick={() => setShowNewTask(true)}>
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        <span className="hidden sm:inline">New Task</span>
                                    </Button>
                                </div>
                            </div>

                            {/* New task form */}
                            {showNewTask && (
                                <Card className="p-3 md:p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">New Task</h3>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewTask(false)}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <Input
                                        placeholder="Task title..."
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        className="h-9 text-sm"
                                        autoFocus
                                        onKeyDown={(e) => e.key === "Enter" && handleCreateMsTask()}
                                    />
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input
                                            type="date"
                                            value={newTaskDue}
                                            onChange={(e) => setNewTaskDue(e.target.value)}
                                            className="h-8 text-xs flex-1"
                                        />
                                        <select
                                            value={newTaskImportance}
                                            onChange={(e) => setNewTaskImportance(e.target.value)}
                                            className="h-8 rounded-md border bg-background px-2 text-xs flex-1"
                                        >
                                            <option value="low">Low</option>
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewTask(false)}>
                                            Cancel
                                        </Button>
                                        <Button size="sm" className="h-8 text-xs" onClick={handleCreateMsTask} disabled={creating || !newTaskTitle.trim()}>
                                            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                                            Create
                                        </Button>
                                    </div>
                                </Card>
                            )}

                            {/* Microsoft tasks list */}
                            {msLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                            ) : (
                                <Card>
                                    <div className="divide-y divide-border/50">
                                        {msFiltered.map((task) => (
                                            <div
                                                key={task.id}
                                                className="flex items-center gap-3 p-3 md:p-4 hover:bg-muted/50 transition-colors group"
                                            >
                                                {/* Complete toggle */}
                                                <button
                                                    onClick={() => toggleMsTaskComplete(task)}
                                                    className="shrink-0"
                                                >
                                                    {task.status === "completed" ? (
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                    ) : (
                                                        <Circle className="w-5 h-5 text-muted-foreground/40 hover:text-primary transition-colors" />
                                                    )}
                                                </button>

                                                <div className="flex-1 min-w-0">
                                                    <p className={cn(
                                                        "text-sm font-medium truncate",
                                                        task.status === "completed" && "line-through text-muted-foreground"
                                                    )}>
                                                        {task.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {task.dueDateTime && (
                                                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                <Calendar className="w-2.5 h-2.5" />
                                                                {new Date(task.dueDateTime.dateTime).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {task.body?.content && (
                                                            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                                {task.body.content}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Importance */}
                                                {task.importance === "high" && (
                                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                                                )}

                                                {/* Status badge */}
                                                <Badge className={cn(
                                                    "text-[10px] shrink-0 hidden sm:inline-flex",
                                                    task.status === "completed"
                                                        ? "bg-emerald-500/10 text-emerald-500"
                                                        : task.status === "inProgress"
                                                        ? "bg-blue-500/10 text-blue-500"
                                                        : "bg-muted text-muted-foreground"
                                                )}>
                                                    {task.status === "completed" ? "Done" :
                                                     task.status === "inProgress" ? "Active" : "To Do"}
                                                </Badge>

                                                {/* Delete */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive"
                                                    onClick={() => deleteMsTask(task.id)}
                                                >
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
                                    <p className="text-sm text-muted-foreground">
                                        {msFilter !== "ALL" ? "Try a different filter" : "Create a task to get started"}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    )
}
