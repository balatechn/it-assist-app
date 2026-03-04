"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

interface GanttTask {
    id: string
    title: string
    status: string
    priority: string
    startDate: string | null
    dueDate: string | null
    assignee: { id: string; name: string; avatar: string | null } | null
    subtasks?: GanttTask[]
}

interface GanttChartProps {
    tasks: GanttTask[]
    projectStart: string | null
    projectEnd: string | null
    onTaskClick?: (taskId: string) => void
}

type ViewMode = "week" | "month" | "quarter"

const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: "#ef4444",
    HIGH: "#f97316",
    URGENT: "#f97316",
    MEDIUM: "#eab308",
    LOW: "#22c55e",
}

const STATUS_FILLS: Record<string, { bg: string; border: string }> = {
    TODO: { bg: "bg-slate-300/60 dark:bg-slate-600/60", border: "border-slate-400 dark:border-slate-500" },
    IN_PROGRESS: { bg: "bg-blue-400/70 dark:bg-blue-500/70", border: "border-blue-500 dark:border-blue-400" },
    DONE: { bg: "bg-emerald-400/70 dark:bg-emerald-500/70", border: "border-emerald-500 dark:border-emerald-400" },
}

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

function startOfDay(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function formatShortDate(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function diffDays(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function GanttChart({ tasks, projectStart, projectEnd, onTaskClick }: GanttChartProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("month")
    const scrollRef = useRef<HTMLDivElement>(null)

    // Flatten tasks + subtasks into a single list for rendering
    const flatTasks = useMemo(() => {
        const result: (GanttTask & { isSubtask: boolean; parentTitle?: string })[] = []
        for (const task of tasks) {
            result.push({ ...task, isSubtask: false })
            if (task.subtasks) {
                for (const sub of task.subtasks) {
                    result.push({ ...sub, isSubtask: true, parentTitle: task.title })
                }
            }
        }
        return result
    }, [tasks])

    // Calculate timeline range
    const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
        const now = new Date()
        let earliest = projectStart ? new Date(projectStart) : now
        let latest = projectEnd ? new Date(projectEnd) : addDays(now, 30)

        // Expand range based on actual task dates
        for (const t of flatTasks) {
            if (t.startDate) {
                const s = new Date(t.startDate)
                if (s < earliest) earliest = s
            }
            if (t.dueDate) {
                const d = new Date(t.dueDate)
                if (d > latest) latest = d
            }
        }

        // Add padding
        const padDays = viewMode === "week" ? 3 : viewMode === "month" ? 7 : 14
        const start = startOfDay(addDays(earliest, -padDays))
        const end = startOfDay(addDays(latest, padDays))
        const total = Math.max(diffDays(start, end), 14)

        return { timelineStart: start, timelineEnd: end, totalDays: total }
    }, [flatTasks, projectStart, projectEnd, viewMode])

    // Column widths based on view mode
    const dayWidth = viewMode === "week" ? 40 : viewMode === "month" ? 24 : 8
    const totalWidth = totalDays * dayWidth

    // Generate column headers
    const headers = useMemo(() => {
        const cols: { label: string; width: number; isToday: boolean }[] = []
        const today = startOfDay(new Date())

        if (viewMode === "week") {
            // Show individual days
            for (let i = 0; i < totalDays; i++) {
                const d = addDays(timelineStart, i)
                const isToday = d.getTime() === today.getTime()
                const isWeekStart = d.getDay() === 1 // Monday
                cols.push({
                    label: isWeekStart || i === 0 ? formatShortDate(d) : d.getDate().toString(),
                    width: dayWidth,
                    isToday,
                })
            }
        } else if (viewMode === "month") {
            // Group by week
            let currentDate = new Date(timelineStart)
            while (currentDate < timelineEnd) {
                const weekEnd = addDays(currentDate, 6)
                const daysInWeek = Math.min(diffDays(currentDate, timelineEnd), 7)
                const width = daysInWeek * dayWidth
                const isToday = today >= currentDate && today <= weekEnd
                cols.push({
                    label: formatShortDate(currentDate),
                    width,
                    isToday,
                })
                currentDate = addDays(currentDate, 7)
            }
        } else {
            // Quarter view — group by month
            let currentDate = new Date(timelineStart)
            while (currentDate < timelineEnd) {
                const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                const daysInMonth = Math.min(diffDays(currentDate, monthEnd) + 1, diffDays(currentDate, timelineEnd))
                const width = daysInMonth * dayWidth
                const isToday = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()
                cols.push({
                    label: currentDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
                    width,
                    isToday,
                })
                currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
            }
        }
        return cols
    }, [timelineStart, timelineEnd, totalDays, dayWidth, viewMode])

    // Today marker position
    const todayOffset = useMemo(() => {
        const today = startOfDay(new Date())
        const days = diffDays(timelineStart, today)
        if (days < 0 || days > totalDays) return null
        return days * dayWidth
    }, [timelineStart, totalDays, dayWidth])

    // Calculate task bar position
    function getBarStyle(task: GanttTask) {
        const taskStart = task.startDate ? startOfDay(new Date(task.startDate)) : null
        const taskEnd = task.dueDate ? startOfDay(new Date(task.dueDate)) : null

        if (!taskStart && !taskEnd) return null

        const start = taskStart || taskEnd!
        const end = taskEnd || addDays(start, 1)
        const duration = Math.max(diffDays(start, end), 1)

        const left = diffDays(timelineStart, start) * dayWidth
        const width = Math.max(duration * dayWidth, dayWidth)

        return { left, width }
    }

    // Scroll to today on mount
    useEffect(() => {
        if (scrollRef.current && todayOffset !== null) {
            const containerWidth = scrollRef.current.clientWidth
            scrollRef.current.scrollLeft = Math.max(0, todayOffset - containerWidth / 3)
        }
    }, [todayOffset])

    const ROW_HEIGHT = 40
    const TASK_LABEL_WIDTH = 260

    if (flatTasks.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                <Calendar className="w-5 h-5 mr-2" /> No tasks to display. Add tasks with dates to see the Gantt chart.
            </div>
        )
    }

    const tasksWithDates = flatTasks.filter(t => t.startDate || t.dueDate)
    const tasksWithoutDates = flatTasks.filter(t => !t.startDate && !t.dueDate)

    return (
        <div className="border rounded-xl overflow-hidden bg-card">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-1">
                    <Button
                        variant={viewMode === "week" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("week")}
                        className="h-7 text-xs"
                    >
                        Week
                    </Button>
                    <Button
                        variant={viewMode === "month" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("month")}
                        className="h-7 text-xs"
                    >
                        Month
                    </Button>
                    <Button
                        variant={viewMode === "quarter" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("quarter")}
                        className="h-7 text-xs"
                    >
                        Quarter
                    </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                    {tasksWithDates.length} of {flatTasks.length} tasks with dates
                </span>
            </div>

            <div className="flex">
                {/* Left: Task Names */}
                <div className="flex-shrink-0 border-r bg-muted/20" style={{ width: TASK_LABEL_WIDTH }}>
                    {/* Header */}
                    <div
                        className="px-3 flex items-center text-xs font-semibold text-muted-foreground border-b bg-muted/30"
                        style={{ height: ROW_HEIGHT }}
                    >
                        Task
                    </div>
                    {/* Task rows */}
                    {tasksWithDates.map((task) => (
                        <div
                            key={task.id}
                            className={cn(
                                "flex items-center gap-2 px-3 border-b hover:bg-muted/30 transition-colors cursor-pointer",
                                task.isSubtask && "pl-7"
                            )}
                            style={{ height: ROW_HEIGHT }}
                            onClick={() => onTaskClick?.(task.isSubtask ? task.id : task.id)}
                        >
                            <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: PRIORITY_COLORS[task.priority] || "#94a3b8" }}
                            />
                            <span className={cn(
                                "text-xs truncate flex-1",
                                task.status === "DONE" && "line-through text-muted-foreground"
                            )}>
                                {task.title}
                            </span>
                            {task.assignee && (
                                <Avatar className="w-5 h-5 flex-shrink-0">
                                    <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                                        {getInitials(task.assignee.name)}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}

                    {/* Tasks without dates */}
                    {tasksWithoutDates.length > 0 && (
                        <>
                            <div
                                className="px-3 flex items-center text-[10px] font-medium text-muted-foreground/60 border-b bg-muted/10"
                                style={{ height: 28 }}
                            >
                                No dates set ({tasksWithoutDates.length})
                            </div>
                            {tasksWithoutDates.map((task) => (
                                <div
                                    key={task.id}
                                    className={cn(
                                        "flex items-center gap-2 px-3 border-b hover:bg-muted/30 transition-colors cursor-pointer opacity-50",
                                        task.isSubtask && "pl-7"
                                    )}
                                    style={{ height: 32 }}
                                    onClick={() => onTaskClick?.(task.id)}
                                >
                                    <div
                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: PRIORITY_COLORS[task.priority] || "#94a3b8" }}
                                    />
                                    <span className="text-xs truncate flex-1">{task.title}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Right: Timeline */}
                <div className="flex-1 overflow-x-auto" ref={scrollRef}>
                    <div style={{ minWidth: totalWidth }}>
                        {/* Header Row */}
                        <div className="flex border-b bg-muted/30" style={{ height: ROW_HEIGHT }}>
                            {headers.map((col, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex-shrink-0 flex items-center justify-center text-[10px] font-medium border-r text-muted-foreground",
                                        col.isToday && "bg-primary/10 text-primary font-semibold"
                                    )}
                                    style={{ width: col.width }}
                                >
                                    {col.label}
                                </div>
                            ))}
                        </div>

                        {/* Task Bars */}
                        <div className="relative">
                            {/* Today line */}
                            {todayOffset !== null && (
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-400/60 z-10"
                                    style={{ left: todayOffset }}
                                >
                                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 text-[8px] font-bold text-red-500 bg-red-50 dark:bg-red-950/40 px-1 rounded">
                                        Today
                                    </div>
                                </div>
                            )}

                            {/* Grid lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                                {headers.map((col, i) => (
                                    <div
                                        key={i}
                                        className="flex-shrink-0 border-r border-dashed border-muted-foreground/10"
                                        style={{ width: col.width }}
                                    />
                                ))}
                            </div>

                            {/* Bars */}
                            {tasksWithDates.map((task) => {
                                const barStyle = getBarStyle(task)
                                if (!barStyle) return null

                                const fills = STATUS_FILLS[task.status] || STATUS_FILLS.TODO

                                return (
                                    <div
                                        key={task.id}
                                        className="relative border-b"
                                        style={{ height: ROW_HEIGHT }}
                                    >
                                        <div
                                            className={cn(
                                                "absolute top-2 h-6 rounded-md border cursor-pointer shadow-sm",
                                                "hover:shadow-md hover:scale-y-110 transition-all duration-150",
                                                fills.bg,
                                                fills.border,
                                                task.isSubtask && "h-5 top-2.5 rounded-sm opacity-85"
                                            )}
                                            style={{
                                                left: barStyle.left,
                                                width: Math.max(barStyle.width, 20),
                                            }}
                                            onClick={() => onTaskClick?.(task.id)}
                                            title={`${task.title}${task.startDate ? `\nStart: ${new Date(task.startDate).toLocaleDateString()}` : ""}${task.dueDate ? `\nDue: ${new Date(task.dueDate).toLocaleDateString()}` : ""}`}
                                        >
                                            {barStyle.width > 60 && (
                                                <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-foreground/80 truncate">
                                                    {task.title}
                                                </span>
                                            )}
                                            {/* Priority dot */}
                                            <div
                                                className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white dark:border-gray-800"
                                                style={{ backgroundColor: PRIORITY_COLORS[task.priority] || "#94a3b8" }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Spacer for tasks without dates */}
                            {tasksWithoutDates.length > 0 && (
                                <>
                                    <div className="border-b bg-muted/10" style={{ height: 28 }} />
                                    {tasksWithoutDates.map((task) => (
                                        <div key={task.id} className="border-b" style={{ height: 32 }}>
                                            <div className="flex items-center justify-center h-full">
                                                <span className="text-[10px] text-muted-foreground/40 italic">—</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/20 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-2 rounded-sm bg-slate-300/80" /> To Do
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-2 rounded-sm bg-blue-400/80" /> In Progress
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-2 rounded-sm bg-emerald-400/80" /> Done
                </span>
                <span className="flex items-center gap-1 ml-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Critical
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> High
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Medium
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Low
                </span>
            </div>
        </div>
    )
}
