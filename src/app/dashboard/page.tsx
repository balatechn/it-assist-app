"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    FolderKanban,
    CheckSquare,
    AlertTriangle,
    TrendingUp,
    Plus,
    ArrowRight,
    Clock,
    Target,
} from "lucide-react"
import { cn, formatDate, getInitials, getStatusColor, getPriorityColor } from "@/lib/utils"

interface DashboardStats {
    totalProjects: number
    activeTasks: number
    overdueTasks: number
    completionRate: number
    projects: Array<{
        id: string
        name: string
        status: string
        progress: number
        color: string | null
        clientName: string | null
        _count: { tasks: number }
    }>
    recentTasks: Array<{
        id: string
        title: string
        status: string
        priority: string
        dueDate: string | null
        project: { name: string; color: string | null }
        assignee: { name: string } | null
    }>
    tasksByPriority: { LOW: number; MEDIUM: number; HIGH: number }
    tasksByStatus: { TODO: number; IN_PROGRESS: number; DONE: number }
}

export default function DashboardPage() {
    const { data: session } = useSession()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/dashboard")
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (e) {
            console.error("Failed to fetch stats", e)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Skeleton stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-4 w-24 bg-muted rounded mb-3" />
                                <div className="h-8 w-16 bg-muted rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    const statCards = [
        {
            title: "Total Projects",
            value: stats?.totalProjects || 0,
            icon: FolderKanban,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            trend: "+2 this month",
        },
        {
            title: "Active Tasks",
            value: stats?.activeTasks || 0,
            icon: CheckSquare,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            trend: `${stats?.tasksByStatus?.IN_PROGRESS || 0} in progress`,
        },
        {
            title: "Overdue Tasks",
            value: stats?.overdueTasks || 0,
            icon: AlertTriangle,
            color: "text-red-500",
            bg: "bg-red-500/10",
            trend: "Needs attention",
        },
        {
            title: "Completion Rate",
            value: `${stats?.completionRate || 0}%`,
            icon: TrendingUp,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            trend: "All projects avg",
        },
    ]

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        Welcome back, {session?.user?.name?.split(" ")[0]} 👋
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Here&apos;s what&apos;s happening with your projects today.
                    </p>
                </div>
                <Link href="/dashboard/projects/new">
                    <Button className="gradient-primary text-white shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <Card key={i} className="hover:shadow-md transition-all duration-200 group">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                                <div className={cn("p-2 rounded-lg transition-transform duration-200 group-hover:scale-110", stat.bg)}>
                                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                                </div>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">{stat.trend}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Projects Overview */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-semibold">Active Projects</CardTitle>
                        <Link href="/dashboard/projects">
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                                View All <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {stats?.projects?.slice(0, 4).map((project) => (
                            <Link
                                key={project.id}
                                href={`/dashboard/projects/${project.id}`}
                                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 group"
                            >
                                <div
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: project.color || "#3B82F6" }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                            {project.name}
                                        </p>
                                        <Badge className={cn("text-[10px]", getStatusColor(project.status))}>
                                            {project.status.replace("_", " ")}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {project.clientName || "No client"} • {project._count.tasks} tasks
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="w-24">
                                        <Progress value={project.progress} className="h-1.5" />
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                                        {project.progress}%
                                    </span>
                                </div>
                            </Link>
                        ))}

                        {(!stats?.projects || stats.projects.length === 0) && (
                            <div className="text-center py-8">
                                <FolderKanban className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No projects yet</p>
                                <Link href="/dashboard/projects/new">
                                    <Button variant="outline" size="sm" className="mt-3">
                                        <Plus className="w-3 h-3 mr-1" /> Create Project
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tasks by Priority */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Tasks by Priority</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { label: "High Priority", count: stats?.tasksByPriority?.HIGH || 0, color: "bg-red-500", total: (stats?.activeTasks || 1) },
                            { label: "Medium Priority", count: stats?.tasksByPriority?.MEDIUM || 0, color: "bg-amber-500", total: (stats?.activeTasks || 1) },
                            { label: "Low Priority", count: stats?.tasksByPriority?.LOW || 0, color: "bg-slate-400", total: (stats?.activeTasks || 1) },
                        ].map((item) => (
                            <div key={item.label} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className="font-medium">{item.count}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-700", item.color)}
                                        style={{ width: `${Math.min((item.count / item.total) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Task Status Summary */}
                        <div className="pt-4 border-t border-border/50 space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">By Status</p>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: "To Do", count: stats?.tasksByStatus?.TODO || 0, icon: Target },
                                    { label: "In Progress", count: stats?.tasksByStatus?.IN_PROGRESS || 0, icon: Clock },
                                    { label: "Done", count: stats?.tasksByStatus?.DONE || 0, icon: CheckSquare },
                                ].map((item) => (
                                    <div key={item.label} className="text-center p-2 rounded-lg bg-muted/50">
                                        <item.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                                        <p className="text-lg font-bold">{item.count}</p>
                                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Tasks */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold">Recent Tasks</CardTitle>
                    <Link href="/dashboard/tasks">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                            View All <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {stats?.recentTasks?.slice(0, 5).map((task) => (
                            <div
                                key={task.id}
                                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200"
                            >
                                <div
                                    className="w-1 h-8 rounded-full shrink-0"
                                    style={{ backgroundColor: task.project.color || "#3B82F6" }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{task.title}</p>
                                    <p className="text-xs text-muted-foreground">{task.project.name}</p>
                                </div>
                                <Badge className={cn("text-[10px] shrink-0", getPriorityColor(task.priority))}>
                                    {task.priority}
                                </Badge>
                                <Badge className={cn("text-[10px] shrink-0", getStatusColor(task.status))}>
                                    {task.status.replace("_", " ")}
                                </Badge>
                                {task.assignee && (
                                    <Avatar className="w-7 h-7 shrink-0">
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                            {getInitials(task.assignee.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                {task.dueDate && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                        {formatDate(task.dueDate)}
                                    </span>
                                )}
                            </div>
                        ))}

                        {(!stats?.recentTasks || stats.recentTasks.length === 0) && (
                            <div className="text-center py-8">
                                <CheckSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No tasks yet</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
