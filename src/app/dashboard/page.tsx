"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    FolderKanban,
    CheckSquare,
    AlertTriangle,
    Plus,
    ArrowRight,
    Clock,
    Target,
    Zap,
    BarChart3,
    ArrowUpRight,
    Layers,
    Calendar,
    Ban,
    Circle,
    ShieldAlert,
    UserCheck,
    ExternalLink,
} from "lucide-react"
import { cn, formatDate, getInitials, getStatusColor, getPriorityColor } from "@/lib/utils"

/* ── Group company hierarchy config ────────────────────────── */
const GROUP_COMPANIES = {
    parent: {
        name: "National Group India",
        logo: "/logos/national-group.png",
        website: "https://nationalgroupindia.com",
        color: "#e8b84a",
        tagline: "Since 1949",
    },
    subsidiaries: [
        {
            name: "Rainland AutoCorp",
            logo: "/logos/rainland-autocorp.png",
            website: "https://rainlandautocorp.com",
            color: "#F97316",
            bgGradient: "from-orange-500/10 to-orange-600/5",
            borderColor: "border-orange-500/40",
            domain: "rainlandautocorp.com",
        },
        {
            name: "National Consulting India",
            logo: null,
            website: null,
            color: "#10B981",
            bgGradient: "from-emerald-500/10 to-emerald-600/5",
            borderColor: "border-emerald-500/40",
            domain: "nationalconsultingindia.com",
        },
        {
            name: "iSky Transport",
            logo: "/logos/isky-transport.png",
            website: "https://iskytransport.com",
            color: "#0EA5E9",
            bgGradient: "from-sky-500/10 to-sky-600/5",
            borderColor: "border-sky-500/40",
            domain: "iskytransport.com",
        },
        {
            name: "National Infra Build",
            logo: "/logos/national-infrabuild.png",
            website: "https://nationalinfrabuild.com",
            color: "#3B82F6",
            bgGradient: "from-blue-500/10 to-blue-600/5",
            borderColor: "border-blue-500/40",
            domain: "nationalinfrabuild.com",
        },
    ],
}

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
    tasksByPriority: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL?: number }
    tasksByStatus: { NOT_STARTED: number; TODO: number; IN_PROGRESS: number; BLOCKED: number; DONE: number; CANCELLED: number }
    newProjectsThisMonth: number
    completedTasksThisMonth: number
    notStartedCount: number
    blockedCount: number
    cancelledCount: number
    assignedToMeCount: number
    highPriorityCount: number
    organization?: { name: string; logo: string | null; domain: string } | null
}

/* ── Animated number counter ───────────────────────────────── */
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
    const [display, setDisplay] = useState(0)
    useEffect(() => {
        if (value === 0) { setDisplay(0); return }
        const duration = 600
        const steps = 20
        const increment = value / steps
        let current = 0
        const timer = setInterval(() => {
            current += increment
            if (current >= value) { setDisplay(value); clearInterval(timer) }
            else setDisplay(Math.floor(current))
        }, duration / steps)
        return () => clearInterval(timer)
    }, [value])
    return <>{display}{suffix}</>
}

/* ── CSS-only donut chart ──────────────────────────────────── */
function DonutChart({ value, size = 80, stroke = 8 }: { value: number; size?: number; stroke?: number }) {
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (value / 100) * circumference
    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke="currentColor" className="text-muted/30" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke="url(#donutGrad)" strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out" />
            <defs>
                <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c8932e" />
                    <stop offset="100%" stopColor="#e8b84a" />
                </linearGradient>
            </defs>
        </svg>
    )
}

/* ── Mini horizontal bar ───────────────────────────────────── */
function MiniBar({ pct, color }: { pct: number; color: string }) {
    return (
        <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", color)}
                style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
    )
}

export default function DashboardPage() {
    const { data: session } = useSession()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard")
            if (res.ok) setStats(await res.json())
        } catch (e) { console.error("Failed to fetch stats", e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchStats() }, [fetchStats])

    /* ── Skeleton ───────────────────────────── */
    if (loading) {
        return (
            <div className="space-y-6 p-1" role="status" aria-label="Loading dashboard">
                <div className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 h-64 rounded-2xl bg-muted/40 animate-pulse" />
                    <div className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
                </div>
            </div>
        )
    }

    const total = stats?.activeTasks || 1

    return (
        <div className="space-y-5 pb-20 md:pb-6">

            {/* ── Hero banner ────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl p-5 md:p-7"
                style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)" }}>
                {/* Decorative circles */}
                <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, #e8b84a 0%, transparent 70%)" }} />
                <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full opacity-[0.07]"
                    style={{ background: "radial-gradient(circle, #e8b84a 0%, transparent 70%)" }} />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        {/* Parent company branding */}
                        <div className="flex items-center gap-3 mb-3">
                            <Image
                                src={GROUP_COMPANIES.parent.logo}
                                alt={GROUP_COMPANIES.parent.name}
                                width={40}
                                height={40}
                                className="rounded-lg object-contain bg-white/10 p-1"
                            />
                            <div>
                                <span className="text-sm md:text-base font-bold tracking-[0.15em] text-[#e8b84a]">
                                    {GROUP_COMPANIES.parent.name.toUpperCase()}
                                </span>
                                <p className="text-[10px] text-[#e8b84a]/50 tracking-wider">{GROUP_COMPANIES.parent.tagline}</p>
                            </div>
                        </div>
                        {/* Current organization highlight */}
                        {stats?.organization && (
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-1 w-1 rounded-full bg-[#e8b84a]/40" />
                                <span className="text-xs font-semibold tracking-wider text-white/70">
                                    {GROUP_COMPANIES.parent.name} ({stats.organization.domain})
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-5 h-5 text-[#e8b84a]" />
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#e8b84a]/80">
                                Dashboard
                            </span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">
                            Welcome back, {session?.user?.name?.split(" ")[0]} 👋
                        </h2>
                        <p className="text-sm text-white/50 mt-1">
                            Here&apos;s what&apos;s happening with your projects today.
                        </p>
                    </div>
                    <Link href="/dashboard/projects/new"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[#c8932e]/20 transition-all hover:shadow-[#c8932e]/40 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: "linear-gradient(135deg, #c8932e 0%, #e8b84a 100%)" }}>
                        <Plus className="w-4 h-4" /> New Project
                    </Link>
                </div>
            </div>

            {/* ── Group Companies Strip ──────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {GROUP_COMPANIES.subsidiaries.map((company) => {
                    const isCurrentOrg = stats?.organization?.domain === company.domain
                    return (
                        <div
                            key={company.name}
                            className={cn(
                                "relative group rounded-xl border p-3 transition-all duration-300 overflow-hidden",
                                isCurrentOrg
                                    ? `${company.borderColor} bg-gradient-to-br ${company.bgGradient} shadow-md`
                                    : "border-border/50 bg-card hover:bg-muted/30"
                            )}
                            style={isCurrentOrg ? { boxShadow: `0 0 0 2px ${company.color}30` } : undefined}
                        >
                            {isCurrentOrg && (
                                <div className="absolute top-1.5 right-1.5">
                                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white"
                                        style={{ backgroundColor: company.color }}>
                                        You
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2.5">
                                {company.logo ? (
                                    <Image
                                        src={company.logo}
                                        alt={company.name}
                                        width={32}
                                        height={32}
                                        className="rounded-lg object-contain bg-white/80 dark:bg-white/10 p-0.5 shrink-0"
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                                        style={{ backgroundColor: company.color }}>
                                        {company.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold truncate" style={isCurrentOrg ? { color: company.color } : undefined}>
                                        {company.name}
                                    </p>
                                    {company.website ? (
                                        <a
                                            href={company.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-muted-foreground hover:underline flex items-center gap-0.5"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Visit <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground">Group Company</span>
                                    )}
                                </div>
                            </div>
                            {/* Bottom color accent bar */}
                            <div
                                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: company.color }}
                            />
                        </div>
                    )
                })}
            </div>

            {/* ── Stat Cards ─────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Projects */}
                <div className="group relative rounded-2xl border border-border/50 bg-card p-4 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Projects</span>
                            <div className="p-1.5 rounded-lg bg-blue-500/10">
                                <FolderKanban className="w-4 h-4 text-blue-500" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold tracking-tight">
                            <AnimatedNumber value={stats?.totalProjects || 0} />
                        </p>
                        <div className="flex items-center gap-1 mt-1.5">
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                            <span className="text-[11px] text-emerald-500 font-medium">+{stats?.newProjectsThisMonth ?? 0}</span>
                            <span className="text-[11px] text-muted-foreground">this month</span>
                        </div>
                    </div>
                </div>

                {/* Active Tasks */}
                <div className="group relative rounded-2xl border border-border/50 bg-card p-4 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Active Tasks</span>
                            <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                <CheckSquare className="w-4 h-4 text-emerald-500" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold tracking-tight">
                            <AnimatedNumber value={stats?.activeTasks || 0} />
                        </p>
                        <div className="flex items-center gap-1 mt-1.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">{stats?.tasksByStatus?.IN_PROGRESS || 0} in progress</span>
                        </div>
                    </div>
                </div>

                {/* Overdue */}
                <div className="group relative rounded-2xl border border-border/50 bg-card p-4 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Overdue</span>
                            <div className="p-1.5 rounded-lg bg-red-500/10">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold tracking-tight">
                            <AnimatedNumber value={stats?.overdueTasks || 0} />
                        </p>
                        <div className="flex items-center gap-1 mt-1.5">
                            {(stats?.overdueTasks || 0) > 0
                                ? <><AlertTriangle className="w-3 h-3 text-red-400" /><span className="text-[11px] text-red-400 font-medium">Needs attention</span></>
                                : <><CheckSquare className="w-3 h-3 text-emerald-500" /><span className="text-[11px] text-emerald-500 font-medium">All clear</span></>
                            }
                        </div>
                    </div>
                </div>

                {/* Completion Rate – donut */}
                <div className="group relative rounded-2xl border border-border/50 bg-card p-4 hover:shadow-lg hover:shadow-[#e8b84a]/5 transition-all duration-300 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#e8b84a]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-3">
                        <div className="relative shrink-0">
                            <DonutChart value={stats?.completionRate || 0} size={64} stroke={6} />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold rotate-0">
                                {stats?.completionRate || 0}%
                            </span>
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Done</span>
                            <p className="text-lg font-bold mt-0.5 leading-tight">
                                <AnimatedNumber value={stats?.completedTasksThisMonth ?? 0} />
                                <span className="text-xs font-normal text-muted-foreground ml-1">this mo.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Grid ──────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* Active Projects */}
                <div className="lg:col-span-7 rounded-2xl border border-border/50 bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#e8b84a]" />
                            <h3 className="text-sm font-semibold">Active Projects</h3>
                        </div>
                        <Link href="/dashboard/projects"
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            View All <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="px-5 pb-5 space-y-1">
                        {stats?.projects?.slice(0, 5).map((project) => (
                            <Link key={project.id} href={`/dashboard/projects/${project.id}`}
                                className="flex items-center gap-3 p-3 -mx-1 rounded-xl hover:bg-muted/40 transition-all group">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                                    style={{ backgroundColor: project.color || "#3B82F6" }}>
                                    {project.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate group-hover:text-[#e8b84a] transition-colors">
                                            {project.name}
                                        </p>
                                        <Badge className={cn("text-[9px] px-1.5 py-0", getStatusColor(project.status))}>
                                            {project.status.replace("_", " ")}
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {project.clientName || "No client"} &middot; {project._count.tasks} tasks
                                    </p>
                                </div>
                                <div className="shrink-0 w-20 hidden sm:block">
                                    <div className="flex items-center justify-end gap-2">
                                        <Progress value={project.progress} className="h-1.5 w-14" />
                                        <span className="text-[11px] font-semibold text-muted-foreground w-7 text-right">
                                            {project.progress}%
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {(!stats?.projects || stats.projects.length === 0) && (
                            <div className="text-center py-10">
                                <FolderKanban className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground mb-3">No projects yet</p>
                                <Link href="/dashboard/projects/new"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                                    <Plus className="w-3 h-3" /> Create Project
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column — Priority + Status */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Priority breakdown */}
                    <div className="rounded-2xl border border-border/50 bg-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-[#e8b84a]" />
                            <h3 className="text-sm font-semibold">Task Priority</h3>
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: "High", count: stats?.tasksByPriority?.HIGH || 0, color: "bg-red-500", textColor: "text-red-500" },
                                { label: "Medium", count: stats?.tasksByPriority?.MEDIUM || 0, color: "bg-amber-500", textColor: "text-amber-500" },
                                { label: "Low", count: stats?.tasksByPriority?.LOW || 0, color: "bg-slate-400", textColor: "text-slate-400" },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center gap-3">
                                    <span className="text-[11px] text-muted-foreground w-14">{item.label}</span>
                                    <div className="flex-1"><MiniBar pct={(item.count / total) * 100} color={item.color} /></div>
                                    <span className={cn("text-xs font-bold w-6 text-right", item.textColor)}>{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status tiles */}
                    <div className="grid grid-cols-3 gap-2.5">
                        {[
                            { label: "Not Started", count: stats?.tasksByStatus?.NOT_STARTED || 0, icon: Circle, accent: "border-gray-500/30 bg-gray-500/5" },
                            { label: "To Do", count: stats?.tasksByStatus?.TODO || 0, icon: Target, accent: "border-slate-500/30 bg-slate-500/5" },
                            { label: "In Progress", count: stats?.tasksByStatus?.IN_PROGRESS || 0, icon: Clock, accent: "border-blue-500/30 bg-blue-500/5" },
                            { label: "Blocked", count: stats?.tasksByStatus?.BLOCKED || 0, icon: ShieldAlert, accent: "border-red-500/30 bg-red-500/5" },
                            { label: "Done", count: stats?.tasksByStatus?.DONE || 0, icon: CheckSquare, accent: "border-emerald-500/30 bg-emerald-500/5" },
                            { label: "Cancelled", count: stats?.tasksByStatus?.CANCELLED || 0, icon: Ban, accent: "border-rose-500/30 bg-rose-500/5" },
                        ].map((item) => (
                            <div key={item.label} className={cn("text-center p-3 rounded-xl border transition-all hover:scale-[1.02]", item.accent)}>
                                <item.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                                <p className="text-xl font-bold leading-tight"><AnimatedNumber value={item.count} /></p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Assigned to Me & Blocked quick-stats */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-[#e8b84a]/30 bg-[#e8b84a]/5">
                            <UserCheck className="w-5 h-5 text-[#e8b84a]" />
                            <div>
                                <p className="text-lg font-bold leading-tight"><AnimatedNumber value={stats?.assignedToMeCount || 0} /></p>
                                <p className="text-[10px] text-muted-foreground">Assigned to Me</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-orange-500/30 bg-orange-500/5">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            <div>
                                <p className="text-lg font-bold leading-tight"><AnimatedNumber value={stats?.highPriorityCount || 0} /></p>
                                <p className="text-[10px] text-muted-foreground">High Priority</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Recent Tasks ────────────────────────── */}
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#e8b84a]" />
                        <h3 className="text-sm font-semibold">Recent Tasks</h3>
                    </div>
                    <Link href="/dashboard/tasks"
                        className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                        View All <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                <div className="px-5 pb-5 space-y-1">
                    {stats?.recentTasks?.slice(0, 6).map((task) => (
                        <div key={task.id}
                            className="flex items-center gap-3 p-3 -mx-1 rounded-xl hover:bg-muted/40 transition-all">
                            <div className="w-1 h-8 rounded-full shrink-0"
                                style={{ backgroundColor: task.project.color || "#3B82F6" }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{task.title}</p>
                                <p className="text-[11px] text-muted-foreground">{task.project.name}</p>
                            </div>
                            <Badge className={cn("text-[9px] px-1.5 py-0 shrink-0", getPriorityColor(task.priority))}>
                                {task.priority}
                            </Badge>
                            <Badge className={cn("text-[9px] px-1.5 py-0 shrink-0 hidden sm:inline-flex", getStatusColor(task.status))}>
                                {task.status.replace("_", " ")}
                            </Badge>
                            {task.assignee && (
                                <Avatar className="w-6 h-6 shrink-0 hidden sm:flex">
                                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                        {getInitials(task.assignee.name)}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                            {task.dueDate && (
                                <span className="text-[11px] text-muted-foreground shrink-0 hidden lg:block">
                                    {formatDate(task.dueDate)}
                                </span>
                            )}
                        </div>
                    ))}
                    {(!stats?.recentTasks || stats.recentTasks.length === 0) && (
                        <div className="text-center py-10">
                            <CheckSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No tasks yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
