"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
    ArrowLeft, Plus, Calendar, DollarSign, Clock,
    CheckSquare, MessageSquare, Paperclip, GripVertical,
    Target, Trash2, Pencil, BarChart3, LayoutGrid,
} from "lucide-react"
import { cn, formatDate, formatCurrency, getInitials, getStatusColor, getPriorityColor, isManager } from "@/lib/utils"
import { TaskDetailModal } from "@/components/task-detail-modal"
import { ProjectEditModal } from "@/components/project-edit-modal"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { GanttChart } from "@/components/gantt-chart"

interface Task {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    startDate: string | null
    dueDate: string | null
    sortOrder: number
    assignee: { id: string; name: string; avatar: string | null } | null
    subtasks?: Array<{
        id: string
        title: string
        status: string
        priority: string
        startDate: string | null
        dueDate: string | null
        assignee: { id: string; name: string; avatar: string | null } | null
    }>
    _count: { comments: number; files: number; subtasks: number }
}

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
    creator: { id: string; name: string; email: string }
    manager: { id: string; name: string; email: string } | null
    tasks: Task[]
    _count: { tasks: number; files: number }
}

const COLUMNS = [
    { id: "TODO", label: "To Do", icon: Target, color: "text-slate-500" },
    { id: "IN_PROGRESS", label: "In Progress", icon: Clock, color: "text-blue-500" },
    { id: "DONE", label: "Done", icon: CheckSquare, color: "text-emerald-500" },
]

export default function ProjectDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session } = useSession()
    const role = session?.user?.role
    const isViewer = false // No viewer role in new system
    const canEditProject = isManager(role || "")

    // Core State
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [isBrowser, setIsBrowser] = useState(false)

    // UI State
    const [showNewTask, setShowNewTask] = useState<string | null>(null)
    const [newTaskTitle, setNewTaskTitle] = useState("")
    const [creatingTask, setCreatingTask] = useState(false)
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [showEditProject, setShowEditProject] = useState(false)
    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<"kanban" | "gantt">("kanban")

    // Local Kanban State
    const [tasks, setTasks] = useState<Record<string, Task[]>>({
        TODO: [],
        IN_PROGRESS: [],
        DONE: [],
    })

    useEffect(() => {
        setIsBrowser(true)
        fetchProject()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id])

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/projects/${params.id}`)
            if (res.ok) {
                const data = await res.json()
                setProject(data)

                // Group tasks locally for DnD
                const grouped: Record<string, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] }
                data.tasks.forEach((t: Task) => {
                    if (grouped[t.status]) grouped[t.status].push(t)
                })

                // sort within each array by sortOrder
                Object.values(grouped).forEach(arr => arr.sort((a, b) => a.sortOrder - b.sortOrder))
                setTasks(grouped)
            } else {
                router.push("/dashboard/projects")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleCreateTask = async (status: string) => {
        if (!newTaskTitle.trim()) return
        setCreatingTask(true)

        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTaskTitle,
                    status,
                    projectId: params.id,
                }),
            })

            if (res.ok) {
                setNewTaskTitle("")
                setShowNewTask(null)
                fetchProject()
            }
        } finally {
            setCreatingTask(false)
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        try {
            await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
            fetchProject()
        } catch (e) {
            console.error("Failed to delete task", e)
        }
    }

    const onDragEnd = async (result: DropResult) => {
        const { source, destination } = result

        // Check if dropped outside the list
        if (!destination) return

        const sInd = source.droppableId
        const dInd = destination.droppableId

        // Check if index changed
        if (sInd === dInd && source.index === destination.index) return

        const sourceList = Array.from(tasks[sInd])
        const destList = sInd === dInd ? sourceList : Array.from(tasks[dInd])

        // Execute local reordering logic
        const [removed] = sourceList.splice(source.index, 1)
        removed.status = dInd // update status locally
        destList.splice(destination.index, 0, removed)

        const newTasks = { ...tasks }
        if (sInd === dInd) {
            newTasks[sInd] = destList
        } else {
            newTasks[sInd] = sourceList
            newTasks[dInd] = destList
        }

        // Apply updated sort order dynamically based on index array position
        newTasks[dInd].forEach((t, i) => t.sortOrder = i)
        if (sInd !== dInd) {
            newTasks[sInd].forEach((t, i) => t.sortOrder = i)
        }

        // Optimistically update React state immediately for flawless UI flow
        setTasks(newTasks)

        // Compile batch api payload
        const updates: { id: string; sortOrder: number; status: string }[] = []
        newTasks[dInd].forEach((t, i) => updates.push({ id: t.id, sortOrder: i, status: dInd }))
        if (sInd !== dInd) {
            newTasks[sInd].forEach((t, i) => updates.push({ id: t.id, sortOrder: i, status: sInd }))
        }

        // Transmit backend updates sequentially
        try {
            await fetch("/api/tasks/reorder", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates })
            })
            // Update the main project state quietly to recalculate percentages natively if cross-board
            if (sInd !== dInd) {
                fetchProject()
            }
        } catch (e) {
            console.error("Task movement sync error:", e)
            fetchProject() // Revert to source truth on failure!
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        )
    }

    if (!project) return null

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Link href="/dashboard/projects">
                        <Button variant="ghost" size="icon-sm" className="mt-1">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                style={{ backgroundColor: project.color || "#3B82F6" }}
                            >
                                {project.name.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                                <p className="text-sm text-muted-foreground">{project.clientName || "No client"}</p>
                            </div>
                            <Badge className={cn("text-xs", getStatusColor(project.status))}>
                                {project.status.replace("_", " ")}
                            </Badge>
                            {canEditProject && (
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setShowEditProject(true)}
                                    title="Edit project"
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        {project.description && (
                            <p className="text-sm text-muted-foreground mt-2 max-w-xl">{project.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <CheckSquare className="w-3.5 h-3.5" /> Tasks
                    </div>
                    <p className="text-xl font-bold">{project._count.tasks}</p>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Target className="w-3.5 h-3.5" /> Progress
                    </div>
                    <p className="text-xl font-bold">{project.progress}%</p>
                    <Progress value={project.progress} className="h-1 mt-1" />
                </Card>
                {project.budget && (
                    <Card className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <DollarSign className="w-3.5 h-3.5" /> Budget
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(project.budget)}</p>
                    </Card>
                )}
                {project.startDate && (
                    <Card className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Calendar className="w-3.5 h-3.5" /> Start
                        </div>
                        <p className="text-sm font-medium">{formatDate(project.startDate)}</p>
                    </Card>
                )}
                {project.endDate && (
                    <Card className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Calendar className="w-3.5 h-3.5" /> Deadline
                        </div>
                        <p className="text-sm font-medium">{formatDate(project.endDate)}</p>
                    </Card>
                )}
            </div>

            {/* Board View Toggle + Kanban/Gantt */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                        {viewMode === "kanban" ? "Kanban Board" : "Gantt Chart"}
                    </h3>
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                        <Button
                            variant={viewMode === "kanban" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("kanban")}
                            className="h-7 text-xs gap-1.5"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Kanban
                        </Button>
                        <Button
                            variant={viewMode === "gantt" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("gantt")}
                            className="h-7 text-xs gap-1.5"
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            Gantt
                        </Button>
                    </div>
                </div>

                {/* Gantt Chart View */}
                {viewMode === "gantt" && project && (
                    <GanttChart
                        tasks={Object.values(tasks).flat()}
                        projectStart={project.startDate}
                        projectEnd={project.endDate}
                        onTaskClick={(id) => setSelectedTaskId(id)}
                    />
                )}

                {/* Kanban Board View */}
                {viewMode === "kanban" && isBrowser && (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {COLUMNS.map((column) => {
                                const columnTasks = tasks[column.id] || []
                                return (
                                    <div key={column.id} className="space-y-3">
                                        {/* Column Header */}
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <column.icon className={cn("w-4 h-4", column.color)} />
                                                <span className="text-sm font-semibold">{column.label}</span>
                                                <span className="text-xs text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-full">
                                                    {columnTasks.length}
                                                </span>
                                            </div>
                                            {!isViewer && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => setShowNewTask(showNewTask === column.id ? null : column.id)}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Add Task Input */}
                                        {!isViewer && showNewTask === column.id && (
                                            <Card className="p-3 animate-scale-in">
                                                <Input
                                                    placeholder="Task title..."
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleCreateTask(column.id)}
                                                    autoFocus
                                                    className="mb-2 text-sm"
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleCreateTask(column.id)}
                                                        disabled={creatingTask || !newTaskTitle.trim()}
                                                        className="flex-1 text-xs"
                                                    >
                                                        {creatingTask ? "Creating..." : "Add Task"}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => { setShowNewTask(null); setNewTaskTitle("") }}
                                                        className="text-xs"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </Card>
                                        )}

                                        {/* Droppable Task Area */}
                                        <Droppable droppableId={column.id}>
                                            {(provided, snapshot) => (
                                                <div
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className={cn(
                                                        "space-y-2 min-h-[150px] rounded-xl transition-colors",
                                                        snapshot.isDraggingOver ? "bg-muted/50" : ""
                                                    )}
                                                >
                                                    {columnTasks.map((task, index) => (
                                                        <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={isViewer}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...(isViewer ? {} : provided.dragHandleProps)}
                                                                    style={{ ...provided.draggableProps.style }}
                                                                >
                                                                    <Card
                                                                        className={cn(
                                                                            "p-3 group shadow-sm transition-all duration-200 cursor-pointer",
                                                                            snapshot.isDragging
                                                                                ? "shadow-lg scale-[1.02] border-primary/50 rotate-1"
                                                                                : "hover:shadow-md hover:border-primary/20",
                                                                            task.status === "DONE" && !snapshot.isDragging ? "opacity-75" : ""
                                                                        )}
                                                                        onClick={() => setSelectedTaskId(task.id)}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <p className={cn(
                                                                                "text-sm font-medium line-clamp-2 flex-1",
                                                                                task.status === "DONE" && "line-through text-muted-foreground"
                                                                            )}>
                                                                                {task.title}
                                                                            </p>
                                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                                                                                {!isViewer && (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); setDeleteTaskId(task.id) }}
                                                                                        className="p-1 rounded hover:bg-destructive/10 text-destructive/70"
                                                                                        title="Delete"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </button>
                                                                                )}
                                                                                <GripVertical className="w-4 h-4 mt-0.5 text-muted-foreground/30 cursor-grab active:cursor-grabbing" />
                                                                            </div>
                                                                        </div>

                                                                        {task.description && (
                                                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                                                                        )}

                                                                        <div className="flex items-center justify-between mt-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <Badge className={cn("text-[9px] px-1.5", getPriorityColor(task.priority))}>
                                                                                    {task.priority}
                                                                                </Badge>
                                                                                {task.dueDate && (
                                                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                                        <Calendar className="w-2.5 h-2.5" />
                                                                                        {formatDate(task.dueDate)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5">
                                                                                {task._count?.comments > 0 && (
                                                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                                        <MessageSquare className="w-2.5 h-2.5" /> {task._count.comments}
                                                                                    </span>
                                                                                )}
                                                                                {task._count?.files > 0 && (
                                                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                                        <Paperclip className="w-2.5 h-2.5" /> {task._count.files}
                                                                                    </span>
                                                                                )}
                                                                                {task._count?.subtasks > 0 && (
                                                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                                        <CheckSquare className="w-2.5 h-2.5" />
                                                                                        {task.subtasks?.filter(s => s.status === "DONE").length || 0}/{task._count.subtasks}
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
                                                                    </Card>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                )
                            })}
                        </div>
                    </DragDropContext>
                )}
            </div>

            {/* Task Detail Modal */}
            <TaskDetailModal
                taskId={selectedTaskId}
                open={!!selectedTaskId}
                onOpenChange={(open) => { if (!open) setSelectedTaskId(null) }}
                onTaskUpdated={fetchProject}
            />

            {/* Project Edit Modal */}
            <ProjectEditModal
                project={project}
                open={showEditProject}
                onOpenChange={setShowEditProject}
                onProjectUpdated={fetchProject}
            />

            {/* Delete Task Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTaskId}
                onOpenChange={(open) => { if (!open) setDeleteTaskId(null) }}
                title="Delete Task"
                description="Are you sure you want to delete this task? This action cannot be undone."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={async () => {
                    if (deleteTaskId) await handleDeleteTask(deleteTaskId)
                    setDeleteTaskId(null)
                }}
            />
        </div>
    )
}
