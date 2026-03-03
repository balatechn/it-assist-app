"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Shield, Clock, Search, ShieldCheck, Loader2 } from "lucide-react"
import { getInitials, timeAgo } from "@/lib/utils"

interface AuditLog {
    id: string
    action: string
    resource: string
    details: string | null
    ipAddress: string | null
    createdAt: string
    user: {
        id: string
        name: string
        email: string
        avatar: string | null
    }
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch("/api/audit-logs")
                if (res.ok) {
                    const data = await res.json()
                    setLogs(data.data || data)
                }
            } finally {
                setLoading(false)
            }
        }
        fetchLogs()
    }, [])

    const filteredLogs = logs.filter(
        (log) =>
            log.action.toLowerCase().includes(search.toLowerCase()) ||
            log.resource.toLowerCase().includes(search.toLowerCase()) ||
            log.user.name.toLowerCase().includes(search.toLowerCase()) ||
            log.user.email.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
                    <p className="text-muted-foreground mt-1">Track all system activity and access</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 w-64 bg-background"
                        />
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> System Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : filteredLogs.length > 0 ? (
                        <div className="divide-y divide-border/50">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="flex items-start sm:items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                                    <Avatar className="w-8 h-8 shrink-0">
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                            {getInitials(log.user.name)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium">{log.user.name}</span>
                                            <span className="text-xs text-muted-foreground hidden sm:inline-block">({log.user.email})</span>
                                            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider ml-auto sm:ml-2 shrink-0">
                                                {log.action}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-foreground/80 break-words flex-1">
                                                Interacted with <span className="font-semibold text-foreground">{log.resource}</span>
                                                {log.details && <span className="text-muted-foreground ml-1">- {log.details}</span>}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex flex-col items-end gap-1 shrink-0 min-w-[120px]">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {timeAgo(log.createdAt)}
                                        </span>
                                        {log.ipAddress && (
                                            <span className="text-[10px] text-muted-foreground/60 font-mono">
                                                {log.ipAddress}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-1">No activity records found</h3>
                            <p className="text-sm text-muted-foreground">
                                {search ? "Try a different search term" : "No auditable events have been recorded yet."}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
