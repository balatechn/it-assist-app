"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Calendar, User, Flag, MessageSquare, Paperclip,
    Save, Loader2, Clock, AlertTriangle, Trash2,
    ListChecks, Plus, CheckCircle2, Circle, X,
    Tag, Building2, Timer, Activity, Users,
} from "lucide-react"
import { cn, formatDate, getInitials, timeAgo, isAdmin as checkIsAdmin, isManager as checkIsManager } from "@/lib/utils"
import { TASK_STATUS_LABELS, DEPARTMENTS } from "@/lib/constants"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

interface TaskComment {
    id: string
    content: string
    createdAt: string
    author: { id: string; name: string; avatar: string | null }
}

interface Subtask {
    id: string
    title: string
    status: string
    priority: string
    dueDate: string | null
    assignee: { id: string; name: string; avatar: string | null } | null
}

interface TaskActivityItem {
    id: string
    action: string
    field: string | null
    oldValue: string | null
    newValue: string | null
    details: string | null
    createdAt: string
    user: { id: string; name: string; avatar: string | null }
}

interface TaskDetail {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    startDate: string | null
    dueDate: string | null
    sortOrder: number
    tags: string[]
    department: string | null
    estimatedTime: number | null
    createdAt: string
    updatedAt: string
    project: { id: string; name: string; color: string | null }
    assignee: { id: string; name: string; email: string; avatar: string | null } | null
    creator: { id: string; name: string; email: string }
    ccUsers: { id: string; name: string; email: string; avatar: string | null }[]
    subtasks: Subtask[]
    comments: TaskComment[]
    files: Array<{ id: string; name: string; mimeType: string | null; size: number | null; oneDriveUrl: string | null }>
    activities: TaskActivityItem[]
    _count: { comments: number; files: number; subtasks: number }
}

interface TeamMember {
    id: string
    name: string
    email: string
    avatar: string | null
}

interface TaskDetailModalProps {
    taskId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onTaskUpdated?: () => void
}

export function TaskDetailModal({ taskId, open, onOpenChange, onTaskUpdated }: TaskDetailModalProps) {
    const { data: session } = useSession()

    const [task, setTask] = useState<TaskDetail | null>(null)
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Editable fields
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [priority, setPriority] = useState("MEDIUM")
    const [status, setStatus] = useState("TODO")
    const [dueDate, setDueDate] = useState("")
    const [startDate, setStartDate] = useState("")
    const [assigneeId, setAssigneeId] = useState("")
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState("")
    const [department, setDepartment] = useState("")
    const [estimatedTime, setEstimatedTime] = useState("")
    const [ccUserIds, setCcUserIds] = useState<string[]>([])

    // CC-only viewer: user is in ccUsers list but not creator, assignee, or manager+
    const isCcOnlyViewer = task && session?.user
        ? task.ccUsers?.some(u => u.id === session.user.id) &&
          task.creator.id !== session.user.id &&
          task.assignee?.id !== session.user.id &&
          !checkIsManager(session.user.role || "")
        : false
    const isViewer = isCcOnlyViewer

    // Delete
    const [deleteOpen, setDeleteOpen] = useState(false)

    // Subtasks
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
    const [addingSubtask, setAddingSubtask] = useState(false)

    // Comments
    const [newComment, setNewComment] = useState("")
    const [postingComment, setPostingComment] = useState(false)

    // Active tab
    const [activeSection, setActiveSection] = useState<"details" | "activity">("details")

    const canDeleteTask = task && (
        task.creator.id === session?.user?.id ||
        task.assignee?.id === session?.user?.id ||
        checkIsManager(session?.user?.role || "")
    )

    const handleDeleteTask = async () => {
        if (!taskId) return
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
            if (res.ok) {
                onOpenChange(false)
                onTaskUpdated?.()
            }
        } finally {
            setDeleteOpen(false)
        }
    }

    const handleDeleteComment = async (commentId: string) => {
        if (!taskId) return
        try {
            const res = await fetch(`/api/tasks/${taskId}/comments?commentId=${commentId}`, { method: "DELETE" })
            if (res.ok) await fetchTask()
        } catch { /* silent */ }
    }

    const handleAddSubtask = async () => {
        if (!newSubtaskTitle.trim() || !task) return
        setAddingSubtask(true)
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newSubtaskTitle.trim(), projectId: task.project.id, parentId: task.id }),
            })
            if (res.ok) { setNewSubtaskTitle(""); await fetchTask(); onTaskUpdated?.() }
        } finally { setAddingSubtask(false) }
    }

    const handleToggleSubtask = async (subtaskId: string, currentStatus: string) => {
        const newStatus = currentStatus === "DONE" ? "TODO" : "DONE"
        try {
            await fetch(`/api/tasks/${subtaskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            })
            await fetchTask(); onTaskUpdated?.()
        } catch { /* silent */ }
    }

    const handleDeleteSubtask = async (subtaskId: string) => {
        try {
            await fetch(`/api/tasks/${subtaskId}`, { method: "DELETE" })
            await fetchTask(); onTaskUpdated?.()
        } catch { /* silent */ }
    }

    const handleAddTag = () => {
        const tag = tagInput.trim()
        if (tag && !tags.includes(tag) && tags.length < 10) { setTags([...tags, tag]); setTagInput("") }
    }

    const handleRemoveTag = (t: string) => setTags(tags.filter(x => x !== t))

    const fetchTask = useCallback(async () => {
        if (!taskId) return
        setLoading(true)
        try {
            const res = await fetch(`/api/tasks/${taskId}`)
            if (res.ok) {
                const data: TaskDetail = await res.json()
                setTask(data)
                setTitle(data.title)
                setDescription(data.description || "")
                setPriority(data.priority)
                setStatus(data.status)
                setDueDate(data.dueDate ? data.dueDate.split("T")[0] : "")
                setStartDate(data.startDate ? data.startDate.split("T")[0] : "")
                setAssigneeId(data.assignee?.id || "unassigned")
                setTags(data.tags || [])
                setDepartment(data.department || "")
                setEstimatedTime(data.estimatedTime ? String(data.estimatedTime) : "")
                setCcUserIds(data.ccUsers?.map(u => u.id) || [])
            }
        } finally { setLoading(false) }
    }, [taskId])

    const fetchTeamMembers = useCallback(async () => {
        try {
            const res = await fetch("/api/users")
            if (res.ok) setTeamMembers(await res.json())
        } catch { /* silent */ }
    }, [])

    useEffect(() => {
        if (open && taskId) { fetchTask(); fetchTeamMembers(); setActiveSection("details") }
    }, [open, taskId, fetchTask, fetchTeamMembers])

    const handleSave = async () => {
        if (!taskId || isViewer) return
        setSaving(true)
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null,
                    priority, status,
                    startDate: startDate ? new Date(startDate).toISOString() : null,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                    assigneeId: assigneeId === "unassigned" ? null : assigneeId,
                    tags, department: department || null,
                    estimatedTime: estimatedTime ? parseFloat(estimatedTime) : null,
                    ccUserIds,
                }),
            })
            if (res.ok) { await fetchTask(); onTaskUpdated?.() }
        } finally { setSaving(false) }
    }

    const handlePostComment = async () => {
        if (!newComment.trim() || !taskId || isViewer) return
        setPostingComment(true)
        try {
            const res = await fetch(`/api/tasks/${taskId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment.trim() }),
            })
            if (res.ok) { setNewComment(""); await fetchTask() }
        } finally { setPostingComment(false) }
    }

    const hasChanges = task && (
        title !== task.title ||
        description !== (task.description || "") ||
        priority !== task.priority ||
        status !== task.status ||
        startDate !== (task.startDate ? task.startDate.split("T")[0] : "") ||
        dueDate !== (task.dueDate ? task.dueDate.split("T")[0] : "") ||
        assigneeId !== (task.assignee?.id || "unassigned") ||
        JSON.stringify(tags) !== JSON.stringify(task.tags || []) ||
        department !== (task.department || "") ||
        estimatedTime !== (task.estimatedTime ? String(task.estimatedTime) : "") ||
        JSON.stringify([...ccUserIds].sort()) !== JSON.stringify([...(task.ccUsers?.map(u => u.id) || [])].sort())
    )

    const subtaskProgress = task && task.subtasks.length > 0
        ? Math.round((task.subtasks.filter(s => s.status === "DONE").length / task.subtasks.length) * 100)
        : 0

    function getActivityIcon(action: string) {
        switch (action) {
            case "created": return <Plus className="w-3 h-3 text-emerald-500" />
            case "status_changed": return <Clock className="w-3 h-3 text-blue-500" />
            case "priority_changed": return <Flag className="w-3 h-3 text-orange-500" />
            case "assigned": return <User className="w-3 h-3 text-purple-500" />
            default: return <Activity className="w-3 h-3 text-muted-foreground" />
        }
    }

    function getActivityLabel(act: TaskActivityItem): string {
        switch (act.action) {
            case "created": return act.details || "Created this task"
            case "status_changed":
                return `Changed status from ${TASK_STATUS_LABELS[act.oldValue || ""] || act.oldValue} to ${TASK_STATUS_LABELS[act.newValue || ""] || act.newValue}`
            case "priority_changed":
                return `Changed priority from ${act.oldValue} to ${act.newValue}`
            case "assigned":
                return act.newValue === "unassigned" ? "Unassigned this task" : "Reassigned this task"
            case "updated":
                if (act.field === "title") return `Renamed task to "${act.newValue}"`
                if (act.field === "dueDate") return act.newValue === "none" ? "Removed due date" : `Set due date to ${formatDate(act.newValue!)}`
                return act.details || `Updated ${act.field}`
            default: return act.details || `${act.action}`
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : task ? (
                    <>
                        <DialogHeader>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: task.project.color || "#3B82F6" }} />
                                {task.project.name}
                                {task.department && (
                                    <><span className="text-muted-foreground/40">·</span><Building2 className="w-3 h-3" />{task.department}</>
                                )}
                            </div>
                            <DialogTitle className="sr-only">Edit Task</DialogTitle>
                            <DialogDescription className="sr-only">Edit task details.</DialogDescription>
                        </DialogHeader>

                        {/* Section Tabs */}
                        <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg w-fit">
                            <button onClick={() => setActiveSection("details")}
                                className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all",
                                    activeSection === "details" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                Details
                            </button>
                            <button onClick={() => setActiveSection("activity")}
                                className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all",
                                    activeSection === "activity" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                <Activity className="w-3 h-3 inline mr-1" />
                                Activity ({task.activities?.length || 0})
                            </button>
                        </div>

                        {activeSection === "details" ? (
                            <div className="space-y-4">
                                {/* Title */}
                                <div>
                                    <Label htmlFor="task-title" className="text-xs text-muted-foreground">Title</Label>
                                    <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)}
                                        className="mt-1 text-lg font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
                                        placeholder="Task title..." disabled={isViewer} />
                                </div>

                                {/* Description */}
                                <div>
                                    <Label htmlFor="task-desc" className="text-xs text-muted-foreground">Description</Label>
                                    <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add a description..." className="mt-1 min-h-[80px] resize-none" disabled={isViewer} />
                                </div>

                                {/* Fields Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Status</Label>
                                        <Select value={status} onValueChange={setStatus} disabled={isViewer}>
                                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                                    <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Flag className="w-3 h-3" /> Priority</Label>
                                        <Select value={priority} onValueChange={setPriority} disabled={isViewer}>
                                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                                        <Label htmlFor="task-start" className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Start Date</Label>
                                        <Input id="task-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" disabled={isViewer} />
                                    </div>
                                    <div>
                                        <Label htmlFor="task-due" className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Due Date</Label>
                                        <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" disabled={isViewer} />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Assignee</Label>
                                        <Select value={assigneeId} onValueChange={setAssigneeId} disabled={isViewer}>
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                                {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Department</Label>
                                        <Select value={department || "none"} onValueChange={(v) => setDepartment(v === "none" ? "" : v)} disabled={isViewer}>
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Estimated Time */}
                                <div>
                                    <Label htmlFor="task-est" className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Timer className="w-3 h-3" /> Estimated Time (hours)
                                    </Label>
                                    <Input id="task-est" type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)}
                                        placeholder="e.g. 4.5" className="mt-1 max-w-[200px]" min="0" step="0.5" disabled={isViewer} />
                                </div>

                                {/* Tags */}
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</Label>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {tags.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                                                {tag}
                                                {!isViewer && <button onClick={() => handleRemoveTag(tag)} className="ml-0.5 hover:text-destructive"><X className="w-2.5 h-2.5" /></button>}
                                            </Badge>
                                        ))}
                                        {!isViewer && tags.length < 10 && (
                                            <div className="flex gap-1">
                                                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                                                    placeholder="Add tag..." className="h-6 w-24 text-[11px] px-2" />
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleAddTag} disabled={!tagInput.trim()}>
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CC Users (View-only access) */}
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> CC (View Only)</Label>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {ccUserIds.map((uid) => {
                                            const member = teamMembers.find(m => m.id === uid) || task?.ccUsers?.find(u => u.id === uid)
                                            return (
                                                <Badge key={uid} variant="outline" className="text-[10px] px-2 py-0.5 gap-1.5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                                                    <Avatar className="w-4 h-4">
                                                        <AvatarFallback className="text-[7px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                            {getInitials(member?.name || "?")}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {member?.name || uid}
                                                    {!isViewer && (
                                                        <button onClick={() => setCcUserIds(ccUserIds.filter(id => id !== uid))}
                                                            className="ml-0.5 hover:text-destructive">
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    )}
                                                </Badge>
                                            )
                                        })}
                                        {!isViewer && (
                                            <Select
                                                value=""
                                                onValueChange={(v) => {
                                                    if (v && !ccUserIds.includes(v)) setCcUserIds([...ccUserIds, v])
                                                }}
                                            >
                                                <SelectTrigger className="h-6 w-36 text-[11px] px-2">
                                                    <SelectValue placeholder="+ Add CC user" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {teamMembers
                                                        .filter(m => !ccUserIds.includes(m.id) && m.id !== assigneeId && m.id !== task?.creator.id)
                                                        .map((m) => (
                                                            <SelectItem key={m.id} value={m.id} className="text-xs">
                                                                {m.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>

                                {/* Meta Info */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t flex-wrap">
                                    <span>Created by {task.creator.name}</span>
                                    <span>{formatDate(task.createdAt)}</span>
                                    {task.estimatedTime && <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {task.estimatedTime}h est.</span>}
                                    {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED" && (
                                        <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="w-3 h-3" /> Overdue</Badge>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {!isViewer && (
                                    <div className="flex gap-2">
                                        {canDeleteTask && (
                                            <Button variant="outline" onClick={() => setDeleteOpen(true)}
                                                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button onClick={handleSave} disabled={saving || !hasChanges || !title.trim()} className="flex-1">
                                            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                                        </Button>
                                    </div>
                                )}

                                <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Task"
                                    description={`Are you sure you want to delete "${task?.title}"? This action cannot be undone.`}
                                    confirmLabel="Delete" variant="destructive" onConfirm={handleDeleteTask} />

                                {/* ── Subtasks ──────────────── */}
                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                            <ListChecks className="w-4 h-4" /> Subtasks
                                            {task.subtasks.length > 0 && (
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    ({task.subtasks.filter(s => s.status === "DONE").length}/{task.subtasks.length})
                                                </span>
                                            )}
                                        </h4>
                                        {subtaskProgress > 0 && <span className="text-[11px] font-medium text-muted-foreground">{subtaskProgress}%</span>}
                                    </div>

                                    {task.subtasks.length > 0 && (
                                        <div className="mb-3">
                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${subtaskProgress}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1 mb-3">
                                        {task.subtasks.map((sub) => (
                                            <div key={sub.id} className="flex items-center gap-2 group/subtask py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                                                <button onClick={() => handleToggleSubtask(sub.id, sub.status)} className="flex-shrink-0" disabled={isViewer}>
                                                    {sub.status === "DONE" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground" />}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <span className={cn("text-sm block truncate", sub.status === "DONE" && "line-through text-muted-foreground")}>{sub.title}</span>
                                                    {sub.dueDate && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                                            <Calendar className="w-2.5 h-2.5" />{formatDate(sub.dueDate)}
                                                        </span>
                                                    )}
                                                </div>
                                                {sub.assignee && (
                                                    <Avatar className="w-5 h-5 flex-shrink-0">
                                                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{getInitials(sub.assignee.name)}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                {!isViewer && (
                                                    <button onClick={() => handleDeleteSubtask(sub.id)}
                                                        className="opacity-0 group-hover/subtask:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-destructive/60 transition-opacity flex-shrink-0">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {!isViewer && (
                                        <div className="flex gap-2">
                                            <Input placeholder="Add a subtask..." value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()} className="flex-1 h-8 text-sm" />
                                            <Button size="sm" variant="outline" onClick={handleAddSubtask} disabled={addingSubtask || !newSubtaskTitle.trim()} className="h-8 px-2">
                                                {addingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* ── Comments ──────────────── */}
                                <div className="border-t pt-4">
                                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                        <MessageSquare className="w-4 h-4" /> Comments ({task.comments.length})
                                    </h4>
                                    {!isViewer && (
                                        <div className="flex gap-2 mb-4">
                                            <Input placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePostComment()} className="flex-1" />
                                            <Button size="sm" onClick={handlePostComment} disabled={postingComment || !newComment.trim()}>
                                                {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                                            </Button>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {task.comments.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
                                        ) : task.comments.map((c) => (
                                            <div key={c.id} className="flex gap-3 group/comment">
                                                <Avatar className="w-7 h-7 flex-shrink-0">
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(c.author.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium">{c.author.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                                                        {(c.author.id === session?.user?.id || checkIsAdmin(session?.user?.role || "")) && (
                                                            <button onClick={() => handleDeleteComment(c.id)}
                                                                className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-destructive/70" title="Delete comment">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-foreground/80 mt-0.5">{c.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Files ──────────────── */}
                                {task.files.length > 0 && (
                                    <div className="border-t pt-4">
                                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                            <Paperclip className="w-4 h-4" /> Attachments ({task.files.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {task.files.map((f) => (
                                                <div key={f.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                                                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                                                    {f.oneDriveUrl ? (
                                                        <a href={f.oneDriveUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{f.name}</a>
                                                    ) : <span className="truncate">{f.name}</span>}
                                                    {f.size && <span className="text-xs text-muted-foreground ml-auto">{(f.size / 1024).toFixed(0)} KB</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ── Activity Timeline ──────────────── */
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold flex items-center gap-2"><Activity className="w-4 h-4" /> Activity Timeline</h4>
                                {(!task.activities || task.activities.length === 0) ? (
                                    <p className="text-xs text-muted-foreground text-center py-8">No activity recorded yet</p>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
                                        <div className="space-y-4">
                                            {task.activities.map((act) => (
                                                <div key={act.id} className="flex gap-3 relative">
                                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 z-10 border border-border">
                                                        {getActivityIcon(act.action)}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <p className="text-sm">
                                                            <span className="font-medium">{act.user.name}</span>{" "}
                                                            <span className="text-muted-foreground">{getActivityLabel(act)}</span>
                                                        </p>
                                                        <span className="text-[10px] text-muted-foreground">{timeAgo(act.createdAt)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">Task not found</div>
                )}
            </DialogContent>
        </Dialog>
    )
}
