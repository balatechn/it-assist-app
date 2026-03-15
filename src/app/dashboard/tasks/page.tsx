"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    CheckSquare, Calendar, MessageSquare, Plus, Loader2,
    CheckCircle2, Circle, Star, Trash2, CloudOff, RefreshCw, X,
    Filter, Users, Save, Clock, Flag, User, Building2,
    Timer, Tag, Activity, ListChecks, Paperclip, AlertTriangle,
} from "lucide-react"
import { cn, formatDate, getInitials, getStatusColor, getPriorityColor, timeAgo, isManager as checkIsManager, isAdmin as checkIsAdmin } from "@/lib/utils"
import { TASK_STATUS_LABELS, DEPARTMENTS } from "@/lib/constants"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
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

interface TaskDetail {
    id: string; title: string; description: string | null
    status: string; priority: string; startDate: string | null; dueDate: string | null
    createdAt: string; tags: string[]; department: string | null; estimatedTime: number | null
    project: { id: string; name: string; color: string | null }
    assignee: { id: string; name: string; email: string; avatar: string | null } | null
    creator: { id: string; name: string; email: string }
    ccUsers: { id: string; name: string; email: string; avatar: string | null }[]
    subtasks: { id: string; title: string; status: string; priority: string; dueDate: string | null; assignee: { id: string; name: string; avatar: string | null } | null }[]
    comments: { id: string; content: string; createdAt: string; author: { id: string; name: string; avatar: string | null } }[]
    files: { id: string; name: string; size: number | null; oneDriveUrl: string | null }[]
    activities: { id: string; action: string; field: string | null; oldValue: string | null; newValue: string | null; details: string | null; createdAt: string; user: { id: string; name: string; avatar: string | null } }[]
    _count: { comments: number; files: number; subtasks: number }
}

interface TeamMember { id: string; name: string; email?: string; avatar?: string | null }

interface MsTask {
    id: string; title: string; status: string; importance: string
    body?: { content: string; contentType: string }
    dueDateTime?: { dateTime: string; timeZone: string }
    createdDateTime: string; completedDateTime?: { dateTime: string; timeZone: string }
}

interface MsTaskList { id: string; displayName: string; wellknownListName?: string }

interface SimpleProject { id: string; name: string; color: string | null }

// ═══════════════════════════════════════
// INLINE TASK DETAIL PANEL
// ═══════════════════════════════════════
function TaskDetailPanel({ taskId, onTaskUpdated, onClose }: {
    taskId: string; onTaskUpdated: () => void; onClose: () => void
}) {
    const { data: session } = useSession()
    const [task, setTask] = useState<TaskDetail | null>(null)
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
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

    const isCcOnlyViewer = task && session?.user
        ? task.ccUsers?.some(u => u.id === session.user.id) &&
          task.creator.id !== session.user.id &&
          task.assignee?.id !== session.user.id &&
          !checkIsManager(session.user.role || "")
        : false
    const isViewer = isCcOnlyViewer

    const [deleteOpen, setDeleteOpen] = useState(false)
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
    const [addingSubtask, setAddingSubtask] = useState(false)
    const [newComment, setNewComment] = useState("")
    const [postingComment, setPostingComment] = useState(false)
    const [activeSection, setActiveSection] = useState<"details" | "activity">("details")

    const canDeleteTask = task && (
        task.creator.id === session?.user?.id ||
        task.assignee?.id === session?.user?.id ||
        checkIsManager(session?.user?.role || "")
    )

    const fetchTask = useCallback(async () => {
        if (!taskId) return
        setLoading(true)
        try {
            const res = await fetch(`/api/tasks/${taskId}`)
            if (res.ok) {
                const data: TaskDetail = await res.json()
                setTask(data)
                setTitle(data.title); setDescription(data.description || "")
                setPriority(data.priority); setStatus(data.status)
                setDueDate(data.dueDate ? data.dueDate.split("T")[0] : "")
                setStartDate(data.startDate ? data.startDate.split("T")[0] : "")
                setAssigneeId(data.assignee?.id || "unassigned")
                setTags(data.tags || []); setDepartment(data.department || "")
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
        fetchTask(); fetchTeamMembers(); setActiveSection("details")
    }, [taskId, fetchTask, fetchTeamMembers])

    const handleSave = async () => {
        if (!taskId || isViewer) return
        setSaving(true)
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(), description: description.trim() || null,
                    priority, status,
                    startDate: startDate ? new Date(startDate).toISOString() : null,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                    assigneeId: assigneeId === "unassigned" ? null : assigneeId,
                    tags, department: department || null,
                    estimatedTime: estimatedTime ? parseFloat(estimatedTime) : null,
                    ccUserIds,
                }),
            })
            if (res.ok) { await fetchTask(); onTaskUpdated() }
        } finally { setSaving(false) }
    }

    const handlePostComment = async () => {
        if (!newComment.trim() || !taskId || isViewer) return
        setPostingComment(true)
        try {
            const res = await fetch(`/api/tasks/${taskId}/comments`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment.trim() }),
            })
            if (res.ok) { setNewComment(""); await fetchTask() }
        } finally { setPostingComment(false) }
    }

    const handleDeleteTask = async () => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
            if (res.ok) { onClose(); onTaskUpdated() }
        } finally { setDeleteOpen(false) }
    }

    const handleDeleteComment = async (commentId: string) => {
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
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newSubtaskTitle.trim(), projectId: task.project.id, parentId: task.id }),
            })
            if (res.ok) { setNewSubtaskTitle(""); await fetchTask(); onTaskUpdated() }
        } finally { setAddingSubtask(false) }
    }

    const handleToggleSubtask = async (subtaskId: string, currentStatus: string) => {
        const newStatus = currentStatus === "DONE" ? "TODO" : "DONE"
        try {
            await fetch(`/api/tasks/${subtaskId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            })
            await fetchTask(); onTaskUpdated()
        } catch { /* silent */ }
    }

    const handleDeleteSubtask = async (subtaskId: string) => {
        try {
            await fetch(`/api/tasks/${subtaskId}`, { method: "DELETE" })
            await fetchTask(); onTaskUpdated()
        } catch { /* silent */ }
    }

    const handleAddTag = () => {
        const tag = tagInput.trim()
        if (tag && !tags.includes(tag) && tags.length < 10) { setTags([...tags, tag]); setTagInput("") }
    }

    const hasChanges = task && (
        title !== task.title || description !== (task.description || "") ||
        priority !== task.priority || status !== task.status ||
        startDate !== (task.startDate ? task.startDate.split("T")[0] : "") ||
        dueDate !== (task.dueDate ? task.dueDate.split("T")[0] : "") ||
        assigneeId !== (task.assignee?.id || "unassigned") ||
        JSON.stringify(tags) !== JSON.stringify(task.tags || []) ||
        department !== (task.department || "") ||
        estimatedTime !== (task.estimatedTime ? String(task.estimatedTime) : "") ||
        JSON.stringify([...ccUserIds].sort()) !== JSON.stringify([...(task.ccUsers?.map(u => u.id) || [])].sort())
    )

    const subtaskProgress = task && task.subtasks.length > 0
        ? Math.round((task.subtasks.filter(s => s.status === "DONE").length / task.subtasks.length) * 100) : 0

    function getActivityIcon(action: string) {
        switch (action) {
            case "created": return <Plus className="w-3 h-3 text-emerald-500" />
            case "status_changed": return <Clock className="w-3 h-3 text-blue-500" />
            case "priority_changed": return <Flag className="w-3 h-3 text-orange-500" />
            case "assigned": return <User className="w-3 h-3 text-purple-500" />
            default: return <Activity className="w-3 h-3 text-muted-foreground" />
        }
    }

    function getActivityLabel(act: TaskDetail["activities"][0]): string {
        switch (act.action) {
            case "created": return act.details || "Created this task"
            case "status_changed":
                return `Changed status from ${TASK_STATUS_LABELS[act.oldValue || ""] || act.oldValue} to ${TASK_STATUS_LABELS[act.newValue || ""] || act.newValue}`
            case "priority_changed": return `Changed priority from ${act.oldValue} to ${act.newValue}`
            case "assigned": return act.newValue === "unassigned" ? "Unassigned this task" : "Reassigned this task"
            case "updated":
                if (act.field === "title") return `Renamed task to "${act.newValue}"`
                if (act.field === "dueDate") return act.newValue === "none" ? "Removed due date" : `Set due date to ${formatDate(act.newValue!)}`
                return act.details || `Updated ${act.field}`
            default: return act.details || `${act.action}`
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!task) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Task not found
            </div>
        )
    }

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED"

    return (
        <div className="flex flex-col h-full">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: task.project.color || "#3B82F6" }} />
                    <span className="text-xs text-muted-foreground truncate">{task.project.name}</span>
                    {task.department && (
                        <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Building2 className="w-3 h-3" />{task.department}</span>
                        </>
                    )}
                    {isOverdue && <Badge variant="destructive" className="text-[10px] gap-1 shrink-0"><AlertTriangle className="w-3 h-3" /> Overdue</Badge>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-3 pb-2 shrink-0">
                <button onClick={() => setActiveSection("details")}
                    className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all",
                        activeSection === "details" ? "bg-muted shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    Details
                </button>
                <button onClick={() => setActiveSection("activity")}
                    className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all",
                        activeSection === "activity" ? "bg-muted shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <Activity className="w-3 h-3 inline mr-1" />
                    Activity ({task.activities?.length || 0})
                </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
                {activeSection === "details" ? (
                    <div className="space-y-5">
                        {/* Title */}
                        <Input value={title} onChange={(e) => setTitle(e.target.value)}
                            className="text-lg font-bold border-0 px-0 focus-visible:ring-0 bg-transparent h-auto py-1"
                            placeholder="Task title..." disabled={isViewer} />

                        {/* Description */}
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description..." className="min-h-[60px] resize-none text-sm" disabled={isViewer} />

                        {/* Fields Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Status</Label>
                                <Select value={status} onValueChange={setStatus} disabled={isViewer}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                                <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><Flag className="w-3 h-3" /> Priority</Label>
                                <Select value={priority} onValueChange={setPriority} disabled={isViewer}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                                <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Start Date</Label>
                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" disabled={isViewer} />
                            </div>
                            <div>
                                <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Due Date</Label>
                                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" disabled={isViewer} />
                            </div>
                            <div>
                                <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><User className="w-3 h-3" /> Assignee</Label>
                                <Select value={assigneeId} onValueChange={setAssigneeId} disabled={isViewer}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><Building2 className="w-3 h-3" /> Department</Label>
                                <Select value={department || "none"} onValueChange={(v) => setDepartment(v === "none" ? "" : v)} disabled={isViewer}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Estimated Time */}
                        <div>
                            <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><Timer className="w-3 h-3" /> Estimated Time (hours)</Label>
                            <Input type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)}
                                placeholder="e.g. 4.5" className="h-9 max-w-[180px]" min="0" step="0.5" disabled={isViewer} />
                        </div>

                        {/* Tags */}
                        <div>
                            <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><Tag className="w-3 h-3" /> Tags</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                                        {tag}
                                        {!isViewer && <button onClick={() => setTags(tags.filter(x => x !== tag))} className="ml-0.5 hover:text-destructive"><X className="w-2.5 h-2.5" /></button>}
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

                        {/* CC Users */}
                        <div>
                            <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><Users className="w-3 h-3" /> CC (View Only)</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {ccUserIds.map((uid) => {
                                    const member = teamMembers.find(m => m.id === uid) || task.ccUsers?.find(u => u.id === uid)
                                    return (
                                        <Badge key={uid} variant="outline" className="text-[10px] px-2 py-0.5 gap-1.5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                                            <Avatar className="w-4 h-4">
                                                <AvatarFallback className="text-[7px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                    {getInitials(member?.name || "?")}
                                                </AvatarFallback>
                                            </Avatar>
                                            {member?.name || uid}
                                            {!isViewer && (
                                                <button onClick={() => setCcUserIds(ccUserIds.filter(id => id !== uid))} className="ml-0.5 hover:text-destructive">
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            )}
                                        </Badge>
                                    )
                                })}
                                {!isViewer && (
                                    <Select value="" onValueChange={(v) => { if (v && !ccUserIds.includes(v)) setCcUserIds([...ccUserIds, v]) }}>
                                        <SelectTrigger className="h-6 w-36 text-[11px] px-2">
                                            <SelectValue placeholder="+ Add CC user" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teamMembers
                                                .filter(m => !ccUserIds.includes(m.id) && m.id !== assigneeId && m.id !== task.creator.id)
                                                .map((m) => <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t flex-wrap">
                            <span>Created by {task.creator.name}</span>
                            <span>{formatDate(task.createdAt)}</span>
                            {task.estimatedTime && <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {task.estimatedTime}h est.</span>}
                        </div>

                        {/* Actions */}
                        {!isViewer && (
                            <div className="flex gap-2">
                                {canDeleteTask && (
                                    <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}
                                        className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive h-9">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                                <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges || !title.trim()} className="flex-1 h-9">
                                    {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...</> : <><Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes</>}
                                </Button>
                            </div>
                        )}

                        <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Task"
                            description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
                            confirmLabel="Delete" variant="destructive" onConfirm={handleDeleteTask} />

                        {/* Subtasks */}
                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-2">
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
                                <div className="mb-2">
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${subtaskProgress}%` }} />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-0.5 mb-2">
                                {task.subtasks.map((sub) => (
                                    <div key={sub.id} className="flex items-center gap-2 group/sub py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                                        <button onClick={() => handleToggleSubtask(sub.id, sub.status)} className="shrink-0" disabled={isViewer}>
                                            {sub.status === "DONE" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <span className={cn("text-sm block truncate", sub.status === "DONE" && "line-through text-muted-foreground")}>{sub.title}</span>
                                            {sub.dueDate && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><Calendar className="w-2.5 h-2.5" />{formatDate(sub.dueDate)}</span>}
                                        </div>
                                        {sub.assignee && (
                                            <Avatar className="w-5 h-5 shrink-0">
                                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{getInitials(sub.assignee.name)}</AvatarFallback>
                                            </Avatar>
                                        )}
                                        {!isViewer && (
                                            <button onClick={() => handleDeleteSubtask(sub.id)}
                                                className="opacity-0 group-hover/sub:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-destructive/60 transition-opacity shrink-0">
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

                        {/* Comments */}
                        <div className="border-t pt-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <MessageSquare className="w-4 h-4" /> Comments ({task.comments.length})
                            </h4>
                            {!isViewer && (
                                <div className="flex gap-2 mb-3">
                                    <Input placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePostComment()} className="flex-1 h-9" />
                                    <Button size="sm" onClick={handlePostComment} disabled={postingComment || !newComment.trim()} className="h-9">
                                        {postingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Post"}
                                    </Button>
                                </div>
                            )}
                            <div className="space-y-3">
                                {task.comments.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
                                ) : task.comments.map((c) => (
                                    <div key={c.id} className="flex gap-2.5 group/comment">
                                        <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{getInitials(c.author.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium">{c.author.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                                                {(c.author.id === session?.user?.id || checkIsAdmin(session?.user?.role || "")) && (
                                                    <button onClick={() => handleDeleteComment(c.id)}
                                                        className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-destructive/70" title="Delete">
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

                        {/* Files */}
                        {task.files.length > 0 && (
                            <div className="border-t pt-4">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                    <Paperclip className="w-4 h-4" /> Attachments ({task.files.length})
                                </h4>
                                <div className="space-y-1.5">
                                    {task.files.map((f) => (
                                        <div key={f.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                            {f.oneDriveUrl ? (
                                                <a href={f.oneDriveUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{f.name}</a>
                                            ) : <span className="truncate">{f.name}</span>}
                                            {f.size && <span className="text-xs text-muted-foreground ml-auto shrink-0">{(f.size / 1024).toFixed(0)} KB</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Activity Timeline */
                    <div className="space-y-4 pt-2">
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
            </div>
        </div>
    )
}


// ═══════════════════════════════════════
// MAIN TASKS PAGE
// ═══════════════════════════════════════
export default function TasksPage() {
    useSession()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>("ALL")
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    // Smart Filters
    const [filterProjectId, setFilterProjectId] = useState("")
    const [filterPriority, setFilterPriority] = useState("")
    const [filterDueDateFrom, setFilterDueDateFrom] = useState("")
    const [filterDueDateTo, setFilterDueDateTo] = useState("")
    const [showFilters, setShowFilters] = useState(false)

    // Project task create
    const [showProjectTaskCreate, setShowProjectTaskCreate] = useState(false)
    const [projectsList, setProjectsList] = useState<SimpleProject[]>([])
    const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([])
    const [ptProjectId, setPtProjectId] = useState("")
    const [ptTitle, setPtTitle] = useState("")
    const [ptDue, setPtDue] = useState("")
    const [ptPriority, setPtPriority] = useState("MEDIUM")
    const [ptAssigneeId, setPtAssigneeId] = useState("")
    const [ptDepartment, setPtDepartment] = useState("")
    const [ptEstimatedTime, setPtEstimatedTime] = useState("")
    const [ptCcUserIds, setPtCcUserIds] = useState<string[]>([])
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

    const searchRef = useRef<HTMLInputElement>(null)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        fetchTasks()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, filter, debouncedSearch, filterProjectId, filterPriority, filterDueDateFrom, filterDueDateTo])

    useEffect(() => { fetchProjectsList(); fetchTeamMembers() }, [])

    const fetchTeamMembers = async () => {
        try {
            const res = await fetch("/api/users")
            if (res.ok) {
                const data = await res.json()
                setTeamMembers(data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })))
            }
        } catch { /* silent */ }
    }

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
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: ptTitle, projectId: ptProjectId, dueDate: ptDue || null,
                    priority: ptPriority, assigneeId: ptAssigneeId || undefined,
                    department: ptDepartment || null,
                    estimatedTime: ptEstimatedTime ? parseFloat(ptEstimatedTime) : null,
                    ccUserIds: ptCcUserIds.length > 0 ? ptCcUserIds : undefined,
                }),
            })
            if (res.ok) {
                setPtTitle(""); setPtDue(""); setPtPriority("MEDIUM"); setPtAssigneeId("")
                setPtDepartment(""); setPtEstimatedTime(""); setPtCcUserIds([])
                setShowProjectTaskCreate(false); fetchTasks()
            }
        } catch { /* silent */ }
        finally { setPtCreating(false) }
    }

    const fetchTasks = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(page), limit: "20" })
            if (filter !== "ALL") params.set("status", filter)
            if (debouncedSearch) params.set("search", debouncedSearch)
            if (filterProjectId) params.set("projectId", filterProjectId)
            if (filterPriority) params.set("priority", filterPriority)
            if (filterDueDateFrom) params.set("dueDateFrom", filterDueDateFrom)
            if (filterDueDateTo) params.set("dueDateTo", filterDueDateTo)
            const res = await fetch(`/api/tasks?${params}`)
            if (res.ok) {
                const json = await res.json()
                setTasks(json.data ?? json)
                if (json.pagination) {
                    setTotalPages(json.pagination.totalPages)
                    setTotal(json.pagination.total)
                }
            }
        } finally { setLoading(false) }
    }, [page, filter, debouncedSearch, filterProjectId, filterPriority, filterDueDateFrom, filterDueDateTo])

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
        } catch { /* silent */ }
        finally { setMsLoading(false) }
    }, [msActiveListId])

    useEffect(() => {
        if (activeTab === "microsoft") fetchMsTasks(msActiveListId || undefined)
    }, [activeTab, msActiveListId, fetchMsTasks])

    const handleCreateMsTask = async () => {
        if (!newTaskTitle.trim()) return
        setCreating(true)
        try {
            const res = await fetch("/api/tasks/microsoft", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId: msActiveListId, title: newTaskTitle, dueDate: newTaskDue || undefined, importance: newTaskImportance }),
            })
            if (res.ok) {
                setNewTaskTitle(""); setNewTaskDue(""); setNewTaskImportance("normal")
                setShowNewTask(false); fetchMsTasks(msActiveListId || undefined)
            }
        } finally { setCreating(false) }
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

    const statusFilters = [
        { id: "ALL", label: "All" }, { id: "TODO", label: "To Do" },
        { id: "IN_PROGRESS", label: "Active" }, { id: "NOT_STARTED", label: "Not Started" },
        { id: "BLOCKED", label: "Blocked" }, { id: "DONE", label: "Done" },
        { id: "CANCELLED", label: "Cancelled" },
    ]

    const activeFilterCount = [filterProjectId, filterPriority, filterDueDateFrom, filterDueDateTo].filter(Boolean).length
    const clearFilters = () => { setFilterProjectId(""); setFilterPriority(""); setFilterDueDateFrom(""); setFilterDueDateTo(""); setPage(1) }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                if (e.key === "Escape") {
                    ;(e.target as HTMLElement).blur()
                    setShowProjectTaskCreate(false); setShowNewTask(false)
                }
                return
            }
            if (e.key === "n" || e.key === "N") { e.preventDefault(); if (activeTab === "project") setShowProjectTaskCreate(true); else setShowNewTask(true) }
            if (e.key === "/") { e.preventDefault(); searchRef.current?.focus() }
            if (e.key === "Escape") { setShowProjectTaskCreate(false); setShowNewTask(false); setSelectedTaskId(null) }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [activeTab])

    // Loading skeleton
    if (loading) {
        return (
            <div className="flex gap-4 animate-in fade-in duration-300" style={{ height: "calc(100vh - 180px)" }}>
                <div className="w-full lg:w-[420px] space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="h-7 w-28 bg-muted rounded-md animate-pulse" />
                        <div className="h-9 w-28 bg-muted rounded-md animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-8 w-16 bg-muted rounded-full animate-pulse" />)}
                    </div>
                    <div className="space-y-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
                <div className="hidden lg:flex flex-1 items-center justify-center rounded-xl border bg-muted/20">
                    <div className="text-center">
                        <div className="h-10 w-10 bg-muted rounded-lg animate-pulse mx-auto mb-3" />
                        <div className="h-4 w-32 bg-muted rounded animate-pulse mx-auto" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">My Tasks</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Project tasks &amp; Microsoft To Do</p>
                </div>
                {activeTab === "project" && (
                    <Button size="sm" className="gradient-primary text-white" onClick={() => setShowProjectTaskCreate(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> New Task
                    </Button>
                )}
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit mb-4">
                <button onClick={() => setActiveTab("project")}
                    className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                        activeTab === "project" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <CheckSquare className="w-3.5 h-3.5 inline mr-1.5" /> Project Tasks
                </button>
                <button onClick={() => setActiveTab("microsoft")}
                    className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                        activeTab === "microsoft" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <svg className="w-3.5 h-3.5 inline mr-1.5" viewBox="0 0 21 21" fill="none">
                        <rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                        <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                    </svg>
                    Microsoft To Do
                </button>
            </div>

            {activeTab === "project" ? (
                <>
                    {/* Create form */}
                    {showProjectTaskCreate && (
                        <Card className="p-3 md:p-4 space-y-3 border-primary/20 mb-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">New Project Task</h3>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowProjectTaskCreate(false)}><X className="w-3.5 h-3.5" /></Button>
                            </div>
                            <Input placeholder="Task title..." value={ptTitle} onChange={(e) => setPtTitle(e.target.value)} className="h-9 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateProjectTask()} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                <select value={ptProjectId} onChange={(e) => setPtProjectId(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs">
                                    <option value="">Select project...</option>
                                    {projectsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <select value={ptAssigneeId} onChange={(e) => setPtAssigneeId(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs">
                                    <option value="">Assign to...</option>
                                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <Input type="date" value={ptDue} onChange={(e) => setPtDue(e.target.value)} className="h-9 text-xs" />
                                <select value={ptPriority} onChange={(e) => setPtPriority(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs">
                                    <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option><option value="URGENT">Urgent</option><option value="CRITICAL">Critical</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                <select value={ptDepartment} onChange={(e) => setPtDepartment(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-xs">
                                    <option value="">Department...</option>
                                    <option value="IT">IT</option><option value="HR">HR</option><option value="Finance">Finance</option>
                                    <option value="Marketing">Marketing</option><option value="Sales">Sales</option><option value="Operations">Operations</option>
                                    <option value="Admin">Admin</option><option value="Legal">Legal</option><option value="Support">Support</option><option value="Engineering">Engineering</option>
                                </select>
                                <Input type="number" placeholder="Est. hours" value={ptEstimatedTime} onChange={(e) => setPtEstimatedTime(e.target.value)} className="h-9 text-xs" min="0" step="0.5" />
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> CC:</span>
                                {ptCcUserIds.map((uid) => {
                                    const member = teamMembers.find(m => m.id === uid)
                                    return (
                                        <Badge key={uid} variant="outline" className="text-[10px] px-1.5 py-0.5 gap-1 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                                            {member?.name || uid}
                                            <button type="button" onClick={() => setPtCcUserIds(ptCcUserIds.filter(id => id !== uid))} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                                        </Badge>
                                    )
                                })}
                                <select value="" onChange={(e) => { if (e.target.value && !ptCcUserIds.includes(e.target.value)) setPtCcUserIds([...ptCcUserIds, e.target.value]) }}
                                    className="h-7 rounded-md border bg-background px-1.5 text-[11px] min-w-[120px]">
                                    <option value="">+ Add CC user</option>
                                    {teamMembers.filter(m => !ptCcUserIds.includes(m.id) && m.id !== ptAssigneeId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowProjectTaskCreate(false)}>Cancel</Button>
                                <Button size="sm" className="h-8 text-xs gradient-primary text-white" onClick={handleCreateProjectTask} disabled={ptCreating || !ptTitle.trim() || !ptProjectId}>
                                    {ptCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Create
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Search + Status Filters */}
                    <div className="space-y-3 mb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <Input ref={searchRef} placeholder="Search tasks... (press /)" value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                                className="h-9 text-sm sm:max-w-[200px]" />
                            <div className="flex gap-1.5 flex-wrap flex-1">
                                {statusFilters.map((s) => (
                                    <button key={s.id} onClick={() => { setFilter(s.id); setPage(1) }}
                                        className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                                            filter === s.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                                        {s.label}{filter === s.id ? ` (${total})` : ""}
                                    </button>
                                ))}
                            </div>
                            <Button variant="outline" size="sm"
                                className={cn("h-8 text-xs gap-1.5 shrink-0", showFilters && "bg-primary/10 border-primary/30")}
                                onClick={() => setShowFilters(!showFilters)}>
                                <Filter className="w-3.5 h-3.5" /> Filters
                                {activeFilterCount > 0 && (
                                    <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">{activeFilterCount}</span>
                                )}
                            </Button>
                        </div>

                        {showFilters && (
                            <Card className="p-3 border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Project</label>
                                        <select value={filterProjectId} onChange={(e) => { setFilterProjectId(e.target.value); setPage(1) }} className="h-8 w-full rounded-md border bg-background px-2 text-xs">
                                            <option value="">All Projects</option>
                                            {projectsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Priority</label>
                                        <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1) }} className="h-8 w-full rounded-md border bg-background px-2 text-xs">
                                            <option value="">All Priorities</option>
                                            <option value="CRITICAL">Critical</option><option value="URGENT">Urgent</option>
                                            <option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Due From</label>
                                        <Input type="date" value={filterDueDateFrom} onChange={(e) => { setFilterDueDateFrom(e.target.value); setPage(1) }} className="h-8 text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Due To</label>
                                        <Input type="date" value={filterDueDateTo} onChange={(e) => { setFilterDueDateTo(e.target.value); setPage(1) }} className="h-8 text-xs" />
                                    </div>
                                </div>
                                {activeFilterCount > 0 && (
                                    <div className="flex justify-end mt-2">
                                        <button onClick={clearFilters} className="text-[11px] text-primary hover:underline">Clear all filters</button>
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>

                    {/* SPLIT PANEL LAYOUT */}
                    <div className="flex gap-4" style={{ height: "calc(100vh - 340px)", minHeight: 400 }}>
                        {/* Left: Task List */}
                        <div className={cn(
                            "overflow-y-auto rounded-xl border bg-card transition-all",
                            selectedTaskId ? "w-full lg:w-[380px] xl:w-[420px] shrink-0" : "w-full"
                        )}>
                            {tasks.length > 0 ? (
                                <div className="divide-y divide-border/30">
                                    {tasks.map((task) => {
                                        const isSelected = selectedTaskId === task.id
                                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED"
                                        return (
                                            <div
                                                key={task.id}
                                                onClick={() => setSelectedTaskId(task.id)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 cursor-pointer transition-all duration-150 group",
                                                    isSelected
                                                        ? "bg-primary/5 border-l-[3px] border-l-primary"
                                                        : "hover:bg-muted/40 border-l-[3px] border-l-transparent"
                                                )}
                                            >
                                                {/* Project color stripe */}
                                                <div className="w-1 self-stretch rounded-full shrink-0"
                                                    style={{ backgroundColor: task.project.color || "#3B82F6" }} />

                                                <div className="flex-1 min-w-0">
                                                    <p className={cn(
                                                        "text-sm font-medium truncate transition-colors",
                                                        isSelected ? "text-primary" : "group-hover:text-foreground"
                                                    )}>
                                                        {task.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-muted-foreground truncate">{task.project.name}</span>
                                                        {task.dueDate && (
                                                            <span className={cn("text-[10px] flex items-center gap-0.5 shrink-0",
                                                                isOverdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                                                                <Calendar className="w-2.5 h-2.5" />
                                                                {formatDate(task.dueDate)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Badge className={cn("text-[9px] px-1.5 py-0", getPriorityColor(task.priority))}>
                                                        {task.priority}
                                                    </Badge>
                                                    <Badge className={cn("text-[9px] px-1.5 py-0 hidden sm:inline-flex", getStatusColor(task.status))}>
                                                        {task.status.replace("_", " ")}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {task._count.comments > 0 && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                            <MessageSquare className="w-2.5 h-2.5" /> {task._count.comments}
                                                        </span>
                                                    )}
                                                    {task.assignee && (
                                                        <Avatar className="w-5 h-5">
                                                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                                                {getInitials(task.assignee.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-12">
                                    <CheckSquare className="w-10 h-10 text-muted-foreground/20 mb-3" />
                                    <h3 className="text-sm font-semibold mb-1">No tasks found</h3>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        {filter !== "ALL" ? "Try adjusting your filter" : "Create your first task"}
                                    </p>
                                    <Button size="sm" className="gradient-primary text-white" onClick={() => setShowProjectTaskCreate(true)}>
                                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Task
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Right: Task Detail Panel */}
                        {selectedTaskId ? (
                            <div className="hidden lg:flex flex-1 rounded-xl border bg-card overflow-hidden">
                                <div className="w-full">
                                    <TaskDetailPanel
                                        taskId={selectedTaskId}
                                        onTaskUpdated={fetchTasks}
                                        onClose={() => setSelectedTaskId(null)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="hidden lg:flex flex-1 rounded-xl border bg-card items-center justify-center">
                                <div className="text-center">
                                    <CheckSquare className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-muted-foreground/60">Select a task to view details</p>
                                    <p className="text-xs text-muted-foreground/40 mt-1">Click on any task from the list</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3">
                            <p className="text-xs text-muted-foreground">Page {page}/{totalPages} ({total} tasks)</p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                            </div>
                        </div>
                    )}

                    {/* Mobile: slide-up panel for small screens */}
                    <div className="lg:hidden">
                        {selectedTaskId && (
                            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)}>
                                <div className="fixed inset-x-0 bottom-0 top-12 bg-card rounded-t-2xl shadow-xl border-t overflow-hidden animate-in slide-in-from-bottom duration-300"
                                    onClick={e => e.stopPropagation()}>
                                    <TaskDetailPanel
                                        taskId={selectedTaskId}
                                        onTaskUpdated={fetchTasks}
                                        onClose={() => setSelectedTaskId(null)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
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
                                    <Button size="sm" className="h-8 text-xs" onClick={() => setShowNewTask(true)}>
                                        <Plus className="w-3.5 h-3.5 mr-1" /><span className="hidden sm:inline">New Task</span>
                                    </Button>
                                </div>
                            </div>

                            {showNewTask && (
                                <Card className="p-3 md:p-4 space-y-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">New Task</h3>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewTask(false)}><X className="w-3.5 h-3.5" /></Button>
                                    </div>
                                    <Input placeholder="Task title..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                                        className="h-9 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateMsTask()} />
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} className="h-8 text-xs flex-1" />
                                        <select value={newTaskImportance} onChange={(e) => setNewTaskImportance(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs flex-1">
                                            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewTask(false)}>Cancel</Button>
                                        <Button size="sm" className="h-8 text-xs" onClick={handleCreateMsTask} disabled={creating || !newTaskTitle.trim()}>
                                            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Create
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
