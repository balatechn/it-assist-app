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
} from "lucide-react"
import { formatDate, getInitials, timeAgo, isAdmin as checkIsAdmin, isManager as checkIsManager } from "@/lib/utils"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

interface TaskComment {
    id: string
    content: string
    createdAt: string
    author: { id: string; name: string; avatar: string | null }
}

interface TaskDetail {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    dueDate: string | null
    sortOrder: number
    createdAt: string
    updatedAt: string
    project: { id: string; name: string; color: string | null }
    assignee: { id: string; name: string; email: string; avatar: string | null } | null
    creator: { id: string; name: string; email: string }
    comments: TaskComment[]
    files: Array<{ id: string; name: string; mimeType: string | null; size: number | null; oneDriveUrl: string | null }>
    _count: { comments: number; files: number }
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
    const isViewer = false // No viewer role in new system — all employees can edit

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
    const [assigneeId, setAssigneeId] = useState("")

    // Delete
    const [deleteOpen, setDeleteOpen] = useState(false)

    // Comments
    const [newComment, setNewComment] = useState("")
    const [postingComment, setPostingComment] = useState(false)

    // Can current user delete this task? (creator, assignee, or Manager+)
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
            const res = await fetch(`/api/tasks/${taskId}/comments?commentId=${commentId}`, {
                method: "DELETE",
            })
            if (res.ok) {
                await fetchTask()
            }
        } catch {
            // silently fail
        }
    }

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
                setAssigneeId(data.assignee?.id || "unassigned")
            }
        } finally {
            setLoading(false)
        }
    }, [taskId])

    const fetchTeamMembers = useCallback(async () => {
        try {
            const res = await fetch("/api/users")
            if (res.ok) {
                const data = await res.json()
                setTeamMembers(data)
            }
        } catch {
            // silently fail
        }
    }, [])

    useEffect(() => {
        if (open && taskId) {
            fetchTask()
            fetchTeamMembers()
        }
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
                    priority,
                    status,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                    assigneeId: assigneeId === "unassigned" ? null : assigneeId,
                }),
            })
            if (res.ok) {
                await fetchTask()
                onTaskUpdated?.()
            }
        } finally {
            setSaving(false)
        }
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
            if (res.ok) {
                setNewComment("")
                await fetchTask()
            }
        } finally {
            setPostingComment(false)
        }
    }

    const hasChanges = task && (
        title !== task.title ||
        description !== (task.description || "") ||
        priority !== task.priority ||
        status !== task.status ||
        dueDate !== (task.dueDate ? task.dueDate.split("T")[0] : "") ||
        assigneeId !== (task.assignee?.id || "unassigned")
    )

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
                                <div
                                    className="w-3 h-3 rounded"
                                    style={{ backgroundColor: task.project.color || "#3B82F6" }}
                                />
                                {task.project.name}
                            </div>
                            <DialogTitle className="sr-only">Edit Task</DialogTitle>
                            <DialogDescription className="sr-only">
                                Edit task details including title, description, priority, status, due date, and assignee.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Title */}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="task-title" className="text-xs text-muted-foreground">Title</Label>
                                <Input
                                    id="task-title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mt-1 text-lg font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
                                    placeholder="Task title..."
                                    disabled={isViewer}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <Label htmlFor="task-desc" className="text-xs text-muted-foreground">Description</Label>
                                <Textarea
                                    id="task-desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add a description..."
                                    className="mt-1 min-h-[80px] resize-none"
                                    disabled={isViewer}
                                />
                            </div>

                            {/* Fields Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Status */}
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Status
                                    </Label>
                                    <Select value={status} onValueChange={setStatus} disabled={isViewer}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TODO">To Do</SelectItem>
                                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                            <SelectItem value="DONE">Done</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Priority */}
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Flag className="w-3 h-3" /> Priority
                                    </Label>
                                    <Select value={priority} onValueChange={setPriority} disabled={isViewer}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HIGH">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Due Date */}
                                <div>
                                    <Label htmlFor="task-due" className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Due Date
                                    </Label>
                                    <Input
                                        id="task-due"
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="mt-1"
                                        disabled={isViewer}
                                    />
                                </div>

                                {/* Assignee */}
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                        <User className="w-3 h-3" /> Assignee
                                    </Label>
                                    <Select value={assigneeId} onValueChange={setAssigneeId} disabled={isViewer}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Unassigned" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {teamMembers.map((member) => (
                                                <SelectItem key={member.id} value={member.id}>
                                                    {member.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Meta Info */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                                <span>Created by {task.creator.name}</span>
                                <span>{formatDate(task.createdAt)}</span>
                                {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && (
                                    <Badge variant="destructive" className="text-[10px] gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Overdue
                                    </Badge>
                                )}
                            </div>

                            {/* Action Buttons */}
                            {!isViewer && (
                                <div className="flex gap-2">
                                    {canDeleteTask && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setDeleteOpen(true)}
                                            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !hasChanges || !title.trim()}
                                        className="flex-1"
                                    >
                                        {saving ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                        ) : (
                                            <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* Delete Confirmation */}
                            <ConfirmDialog
                                open={deleteOpen}
                                onOpenChange={setDeleteOpen}
                                title="Delete Task"
                                description={`Are you sure you want to delete "${task?.title}"? This action cannot be undone.`}
                                confirmLabel="Delete"
                                variant="destructive"
                                onConfirm={handleDeleteTask}
                            />

                            {/* Comments Section */}
                            <div className="border-t pt-4">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                    <MessageSquare className="w-4 h-4" />
                                    Comments ({task.comments.length})
                                </h4>

                                {/* New Comment */}
                                {!isViewer && (
                                    <div className="flex gap-2 mb-4">
                                        <Input
                                            placeholder="Add a comment..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePostComment()}
                                            className="flex-1"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handlePostComment}
                                            disabled={postingComment || !newComment.trim()}
                                        >
                                            {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                                        </Button>
                                    </div>
                                )}

                                {/* Comment List */}
                                <div className="space-y-3">
                                    {task.comments.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-4">
                                            No comments yet
                                        </p>
                                    ) : (
                                        task.comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3 group/comment">
                                                <Avatar className="w-7 h-7 flex-shrink-0">
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                        {getInitials(comment.author.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium">{comment.author.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {timeAgo(comment.createdAt)}
                                                        </span>
                                                        {(comment.author.id === session?.user?.id || checkIsAdmin(session?.user?.role || "")) && (
                                                            <button
                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-destructive/70"
                                                                title="Delete comment"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-foreground/80 mt-0.5">{comment.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Files Section */}
                            {task.files.length > 0 && (
                                <div className="border-t pt-4">
                                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                        <Paperclip className="w-4 h-4" />
                                        Attachments ({task.files.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {task.files.map((file) => (
                                            <div key={file.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                                                <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                                                {file.oneDriveUrl ? (
                                                    <a
                                                        href={file.oneDriveUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline truncate"
                                                    >
                                                        {file.name}
                                                    </a>
                                                ) : (
                                                    <span className="truncate">{file.name}</span>
                                                )}
                                                {file.size && (
                                                    <span className="text-xs text-muted-foreground ml-auto">
                                                        {(file.size / 1024).toFixed(0)} KB
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        Task not found
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
