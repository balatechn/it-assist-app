"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
    Plus, Search, FolderKanban, Calendar, Grid3X3, List,
} from "lucide-react"
import { cn, formatDate, formatCurrency, getInitials, getStatusColor } from "@/lib/utils"
import { useSession } from "next-auth/react"

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
    manager: { id: string; name: string } | null
    _count: { tasks: number; files: number }
}

export default function ProjectsPage() {
    const { data: session } = useSession()
    const role = session?.user?.role
    const canCreateProject = role === "ADMIN" || role === "PROJECT_MANAGER"
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [view, setView] = useState<"grid" | "list">("grid")
    const [filter, setFilter] = useState<string>("ALL")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    useEffect(() => {
        fetchProjects()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

    const fetchProjects = async () => {
        try {
            const res = await fetch(`/api/projects?page=${page}&limit=20`)
            if (res.ok) {
                const json = await res.json()
                setProjects(json.data ?? json)
                if (json.pagination) {
                    setTotalPages(json.pagination.totalPages)
                    setTotal(json.pagination.total)
                }
            }
        } finally {
            setLoading(false)
        }
    }

    const filtered = projects
        .filter(p => filter === "ALL" || p.status === filter)
        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.clientName?.toLowerCase().includes(search.toLowerCase()))

    const statusCounts = {
        ALL: projects.length,
        ACTIVE: projects.filter(p => p.status === "ACTIVE").length,
        PLANNED: projects.filter(p => p.status === "PLANNED").length,
        COMPLETED: projects.filter(p => p.status === "COMPLETED").length,
        ON_HOLD: projects.filter(p => p.status === "ON_HOLD").length,
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
                    <p className="text-muted-foreground mt-1">{projects.length} total projects</p>
                </div>
                {canCreateProject && (
                    <Link href="/dashboard/projects/new">
                        <Button className="gradient-primary text-white shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4 mr-2" />
                            New Project
                        </Button>
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                    {(["ALL", "ACTIVE", "PLANNED", "COMPLETED", "ON_HOLD"] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                                filter === status
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {status.replace("_", " ")} ({statusCounts[status]})
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search projects..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 w-56 bg-muted/50 border-0"
                        />
                    </div>
                    <div className="flex border border-border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setView("grid")}
                            className={cn("p-2 transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={cn("p-2 transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid View */}
            {view === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((project) => (
                        <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                            <Card className="hover:shadow-lg hover:border-primary/20 transition-all duration-300 group cursor-pointer h-full">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                                                style={{ backgroundColor: project.color || "#3B82F6" }}
                                            >
                                                {project.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                                                    {project.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">{project.clientName || "No client"}</p>
                                            </div>
                                        </div>
                                        <Badge className={cn("text-[10px] shrink-0", getStatusColor(project.status))}>
                                            {project.status.replace("_", " ")}
                                        </Badge>
                                    </div>

                                    {project.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium">{project.progress}%</span>
                                        </div>
                                        <Progress
                                            value={project.progress}
                                            className="h-1.5"
                                            indicatorClassName={project.progress === 100 ? "bg-emerald-500" : ""}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <FolderKanban className="w-3 h-3" /> {project._count.tasks} tasks
                                            </span>
                                            {project.endDate && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {formatDate(project.endDate)}
                                                </span>
                                            )}
                                        </div>
                                        {project.manager && (
                                            <Avatar className="w-6 h-6">
                                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                    {getInitials(project.manager.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>

                                    {project.budget && (
                                        <div className="text-xs font-medium text-muted-foreground">
                                            Budget: {formatCurrency(project.budget)}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                /* List View */
                <Card>
                    <div className="divide-y divide-border/50">
                        {filtered.map((project) => (
                            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                                <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-all duration-200 group cursor-pointer">
                                    <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: project.color || "#3B82F6" }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{project.name}</p>
                                        <p className="text-xs text-muted-foreground">{project.clientName || "No client"}</p>
                                    </div>
                                    <Badge className={cn("text-[10px] shrink-0", getStatusColor(project.status))}>
                                        {project.status.replace("_", " ")}
                                    </Badge>
                                    <div className="w-32 shrink-0">
                                        <Progress value={project.progress} className="h-1.5" />
                                    </div>
                                    <span className="text-xs font-medium w-10 text-right shrink-0">{project.progress}%</span>
                                    <span className="text-xs text-muted-foreground shrink-0">{project._count.tasks} tasks</span>
                                    {project.manager && (
                                        <Avatar className="w-6 h-6 shrink-0">
                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                {getInitials(project.manager.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </Card>
            )}

            {filtered.length === 0 && !loading && (
                <div className="text-center py-16">
                    <FolderKanban className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No projects found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {search ? "Try adjusting your search" : "Create your first project to get started"}
                    </p>
                    {canCreateProject && (
                        <Link href="/dashboard/projects/new">
                            <Button className="gradient-primary text-white">
                                <Plus className="w-4 h-4 mr-2" /> Create Project
                            </Button>
                        </Link>
                    )}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages} ({total} projects)
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
