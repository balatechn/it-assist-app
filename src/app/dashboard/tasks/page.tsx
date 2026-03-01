"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    CheckSquare, Calendar, MessageSquare,
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

export default function TasksPage() {
    useSession()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>("ALL")
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    useEffect(() => {
        fetchTasks()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

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

    const filtered = filter === "ALL" ? tasks : tasks.filter(t => t.status === filter)

    const statusFilters = [
        { id: "ALL", label: "All Tasks", count: tasks.length },
        { id: "TODO", label: "To Do", count: tasks.filter(t => t.status === "TODO").length },
        { id: "IN_PROGRESS", label: "In Progress", count: tasks.filter(t => t.status === "IN_PROGRESS").length },
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
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">My Tasks</h2>
                <p className="text-muted-foreground mt-1">All tasks across your projects</p>
            </div>

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
                            <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-all duration-200 group cursor-pointer">
                                <div
                                    className="w-1 h-10 rounded-full shrink-0"
                                    style={{ backgroundColor: task.project.color || "#3B82F6" }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                        {task.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{task.project.name}</p>
                                </div>
                                <Badge className={cn("text-[10px] shrink-0", getPriorityColor(task.priority))}>
                                    {task.priority}
                                </Badge>
                                <Badge className={cn("text-[10px] shrink-0", getStatusColor(task.status))}>
                                    {task.status.replace("_", " ")}
                                </Badge>
                                {task.dueDate && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(task.dueDate)}
                                    </span>
                                )}
                                <div className="flex items-center gap-2 shrink-0">
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
                <div className="text-center py-16">
                    <CheckSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No tasks found</h3>
                    <p className="text-sm text-muted-foreground">
                        {filter !== "ALL" ? "Try adjusting your filter" : "Tasks will appear here when created"}
                    </p>
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
                <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages} ({total} tasks)
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
