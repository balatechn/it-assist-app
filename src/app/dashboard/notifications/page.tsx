"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import {
    Bell, CheckSquare, Clock, FileUp, MessageSquare, FolderKanban,
    CheckCheck, BellOff,
} from "lucide-react"
import { cn, timeAgo } from "@/lib/utils"
import Link from "next/link"

interface Notification {
    id: string
    type: string
    title: string
    message: string
    read: boolean
    link: string | null
    createdAt: string
}

const typeIcons: Record<string, React.ElementType> = {
    TASK_ASSIGNED: CheckSquare,
    DEADLINE_REMINDER: Clock,
    FILE_UPLOADED: FileUp,
    COMMENT_ADDED: MessageSquare,
    PROJECT_UPDATE: FolderKanban,
}

const typeColors: Record<string, string> = {
    TASK_ASSIGNED: "bg-blue-500/10 text-blue-500",
    DEADLINE_REMINDER: "bg-amber-500/10 text-amber-500",
    FILE_UPLOADED: "bg-emerald-500/10 text-emerald-500",
    COMMENT_ADDED: "bg-purple-500/10 text-purple-500",
    PROJECT_UPDATE: "bg-cyan-500/10 text-cyan-500",
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications")
            if (res.ok) {
                const data = await res.json()
                setNotifications(data.notifications)
                setUnreadCount(data.unreadCount)
            }
        } finally {
            setLoading(false)
        }
    }

    const markAllRead = async () => {
        await fetch("/api/notifications", { method: "PATCH" })
        setNotifications(notifications.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
                    <p className="text-muted-foreground mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllRead}>
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Mark all read
                    </Button>
                )}
            </div>

            <Card>
                <div className="divide-y divide-border/50">
                    {notifications.map((n) => {
                        const Icon = typeIcons[n.type] || Bell
                        const colorClass = typeColors[n.type] || "bg-muted text-muted-foreground"

                        const content = (
                            <div
                                className={cn(
                                    "flex items-start gap-4 p-4 transition-all duration-200",
                                    n.read ? "opacity-60" : "hover:bg-muted/50",
                                    !n.read && "bg-primary/[0.02]"
                                )}
                            >
                                <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={cn("text-sm font-medium", !n.read && "font-semibold")}>{n.title}</p>
                                        {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                                </div>
                            </div>
                        )

                        return n.link ? (
                            <Link key={n.id} href={n.link}>{content}</Link>
                        ) : (
                            <div key={n.id}>{content}</div>
                        )
                    })}
                </div>
            </Card>

            {notifications.length === 0 && !loading && (
                <div className="text-center py-16">
                    <BellOff className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No notifications</h3>
                    <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
                </div>
            )}
        </div>
    )
}
