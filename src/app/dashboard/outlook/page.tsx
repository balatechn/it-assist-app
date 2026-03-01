"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { signIn } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Mail, Inbox, Send, FileEdit, Trash2, Archive, Search, Loader2,
    RefreshCw, ChevronLeft, Paperclip, Star, Reply, Forward,
    Plus, X, AlertTriangle, MailOpen, Clock, Link2
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"

interface EmailMessage {
    id: string
    subject: string
    bodyPreview: string
    body?: { contentType: string; content: string }
    from: { emailAddress: { name: string; address: string } }
    toRecipients: Array<{ emailAddress: { name: string; address: string } }>
    ccRecipients?: Array<{ emailAddress: { name: string; address: string } }>
    receivedDateTime: string
    isRead: boolean
    hasAttachments: boolean
    importance: string
    flag: { flagStatus: string }
    conversationId: string
}

interface Attachment {
    id: string
    name: string
    contentType: string
    size: number
}

interface PersonSuggestion {
    name: string
    email: string
}

const folders = [
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "sent", label: "Sent", icon: Send },
    { id: "drafts", label: "Drafts", icon: FileEdit },
    { id: "deleted", label: "Trash", icon: Trash2 },
    { id: "archive", label: "Archive", icon: Archive },
]

export default function OutlookPage() {
    const [loading, setLoading] = useState(true)
    const [needsAuth, setNeedsAuth] = useState(false)
    const [messages, setMessages] = useState<EmailMessage[]>([])
    const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null)
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [activeFolder, setActiveFolder] = useState("inbox")
    const [searchQuery, setSearchQuery] = useState("")
    const [unreadCount, setUnreadCount] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const [showCompose, setShowCompose] = useState(false)
    const [showReply, setShowReply] = useState(false)
    const [messageLoading, setMessageLoading] = useState(false)

    // Compose state
    const [composeTo, setComposeTo] = useState("")
    const [composeCc, setComposeCc] = useState("")
    const [composeSubject, setComposeSubject] = useState("")
    const [composeBody, setComposeBody] = useState("")
    const [sending, setSending] = useState(false)

    // Autocomplete state
    const [toSuggestions, setToSuggestions] = useState<PersonSuggestion[]>([])
    const [ccSuggestions, setCcSuggestions] = useState<PersonSuggestion[]>([])
    const [showToDropdown, setShowToDropdown] = useState(false)
    const [showCcDropdown, setShowCcDropdown] = useState(false)
    const toRef = useRef<HTMLDivElement>(null)
    const ccRef = useRef<HTMLDivElement>(null)
    const searchDebounce = useRef<NodeJS.Timeout | null>(null)

    const searchPeople = useCallback(async (query: string, field: "to" | "cc") => {
        if (query.length < 2) {
            if (field === "to") setToSuggestions([])
            else setCcSuggestions([])
            return
        }
        try {
            const res = await fetch(`/api/outlook/people?q=${encodeURIComponent(query)}`)
            if (res.ok) {
                const data = await res.json()
                if (field === "to") {
                    setToSuggestions(data.people || [])
                    setShowToDropdown((data.people || []).length > 0)
                } else {
                    setCcSuggestions(data.people || [])
                    setShowCcDropdown((data.people || []).length > 0)
                }
            }
        } catch { /* ignore */ }
    }, [])

    const handleEmailFieldChange = (value: string, field: "to" | "cc") => {
        if (field === "to") setComposeTo(value)
        else setComposeCc(value)
        // Get text after last comma for search
        const parts = value.split(",")
        const current = parts[parts.length - 1].trim()
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(() => searchPeople(current, field), 300)
    }

    const selectSuggestion = (person: PersonSuggestion, field: "to" | "cc") => {
        const setter = field === "to" ? setComposeTo : setComposeCc
        const current = field === "to" ? composeTo : composeCc
        const parts = current.split(",").map(s => s.trim()).filter(Boolean)
        parts.pop() // remove partial typed text
        parts.push(person.email)
        setter(parts.join(", ") + ", ")
        if (field === "to") { setShowToDropdown(false); setToSuggestions([]) }
        else { setShowCcDropdown(false); setCcSuggestions([]) }
    }

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (toRef.current && !toRef.current.contains(e.target as Node)) setShowToDropdown(false)
            if (ccRef.current && !ccRef.current.contains(e.target as Node)) setShowCcDropdown(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const fetchMessages = useCallback(async (folder: string, search?: string) => {
        setLoading(true)
        try {
            let url = `/api/outlook/messages?folder=${folder}&top=30`
            if (search) url += `&search=${encodeURIComponent(search)}`
            const res = await fetch(url)
            if (!res.ok) {
                if (res.status === 403) {
                    setNeedsAuth(true)
                    return
                }
                throw new Error("Failed to fetch")
            }
            const data = await res.json()
            setMessages(data.messages || [])
            setUnreadCount(data.unreadCount || 0)
            setNeedsAuth(false)
        } catch (e) {
            console.error("Failed to load emails", e)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchMessages(activeFolder)
    }, [activeFolder, fetchMessages])

    const handleSearch = () => {
        if (searchQuery.trim()) {
            fetchMessages(activeFolder, searchQuery)
        } else {
            fetchMessages(activeFolder)
        }
    }

    const handleRefresh = () => {
        setRefreshing(true)
        fetchMessages(activeFolder, searchQuery || undefined)
    }

    const openMessage = async (msg: EmailMessage) => {
        setSelectedMessage(msg)
        setMessageLoading(true)
        setAttachments([])
        setShowReply(false)
        try {
            const res = await fetch(`/api/outlook/messages/${msg.id}`)
            if (res.ok) {
                const data = await res.json()
                setSelectedMessage(data.message)
                setAttachments(data.attachments || [])
                // Update unread count
                if (!msg.isRead) {
                    setMessages((prev) =>
                        prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m))
                    )
                    setUnreadCount((prev) => Math.max(0, prev - 1))
                }
            }
        } catch (e) {
            console.error("Failed to load email", e)
        } finally {
            setMessageLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/outlook/messages/${id}`, { method: "DELETE" })
            if (res.ok) {
                setMessages((prev) => prev.filter((m) => m.id !== id))
                if (selectedMessage?.id === id) setSelectedMessage(null)
            }
        } catch (e) {
            console.error("Failed to delete", e)
        }
    }

    const handleToggleRead = async (msg: EmailMessage) => {
        try {
            await fetch(`/api/outlook/messages/${msg.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isRead: !msg.isRead }),
            })
            setMessages((prev) =>
                prev.map((m) => (m.id === msg.id ? { ...m, isRead: !m.isRead } : m))
            )
            setUnreadCount((prev) => (msg.isRead ? prev + 1 : Math.max(0, prev - 1)))
        } catch (e) {
            console.error("Failed to toggle read", e)
        }
    }

    const handleToggleFlag = async (msg: EmailMessage) => {
        const newStatus = msg.flag?.flagStatus === "flagged" ? "notFlagged" : "flagged"
        try {
            await fetch(`/api/outlook/messages/${msg.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ flag: { flagStatus: newStatus } }),
            })
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === msg.id ? { ...m, flag: { flagStatus: newStatus } } : m
                )
            )
        } catch (e) {
            console.error("Failed to toggle flag", e)
        }
    }

    const handleSend = async () => {
        if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) return
        setSending(true)
        try {
            const payload: Record<string, unknown> = {
                to: composeTo.split(",").map((e) => e.trim()).filter(Boolean),
                subject: composeSubject,
                content: composeBody.replace(/\n/g, "<br>"),
            }
            if (composeCc.trim()) {
                payload.cc = composeCc.split(",").map((e) => e.trim()).filter(Boolean)
            }
            if (showReply && selectedMessage) {
                payload.replyToId = selectedMessage.id
            }
            const res = await fetch("/api/outlook/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (res.ok) {
                setShowCompose(false)
                setShowReply(false)
                setComposeTo("")
                setComposeCc("")
                setComposeSubject("")
                setComposeBody("")
                // Refresh if on sent folder
                if (activeFolder === "sent") fetchMessages("sent")
            }
        } catch (e) {
            console.error("Failed to send", e)
        } finally {
            setSending(false)
        }
    }

    const startReply = (msg: EmailMessage) => {
        setShowReply(true)
        setShowCompose(true)
        setComposeTo(msg.from.emailAddress.address)
        setComposeSubject(`Re: ${msg.subject}`)
        setComposeBody("")
        setComposeCc("")
    }

    const startForward = (msg: EmailMessage) => {
        setShowReply(false)
        setShowCompose(true)
        setComposeTo("")
        setComposeSubject(`Fwd: ${msg.subject}`)
        setComposeBody(
            `\n\n---------- Forwarded message ----------\nFrom: ${msg.from.emailAddress.name} <${msg.from.emailAddress.address}>\nDate: ${format(new Date(msg.receivedDateTime), "PPp")}\nSubject: ${msg.subject}\n\n${msg.bodyPreview}`
        )
        setComposeCc("")
    }

    const startCompose = () => {
        setShowCompose(true)
        setShowReply(false)
        setComposeTo("")
        setComposeCc("")
        setComposeSubject("")
        setComposeBody("")
    }

    // Auth required screen
    if (needsAuth && !loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Outlook</h2>
                    <p className="text-muted-foreground mt-1">Read and send emails from your Microsoft account</p>
                </div>
                <Card className="border-dashed">
                    <CardContent className="py-16">
                        <div className="text-center max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #916f44, #e2bf79)', boxShadow: '0 10px 25px -5px rgba(145, 111, 68, 0.2)' }}>
                                <Mail className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Connect Outlook</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Sign in with your Microsoft account to access your emails directly within the app.
                            </p>
                            <Button className="gradient-primary text-white shadow-lg" style={{ boxShadow: '0 10px 25px -5px rgba(145, 111, 68, 0.2)' }} onClick={() => signIn("azure-ad")}>
                                <Link2 className="w-4 h-4 mr-2" />
                                Connect Microsoft 365
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-2 md:space-y-2 h-full flex flex-col">
            {/* Header — compact */}
            <div className="flex items-center justify-between gap-2 px-2 md:px-0 pt-2 md:pt-0 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Mobile back button when viewing email */}
                    {selectedMessage && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden h-8 w-8 shrink-0"
                            onClick={() => setSelectedMessage(null)}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    )}
                    <h2 className="text-sm md:text-base font-semibold tracking-tight whitespace-nowrap">
                        {selectedMessage ? "Email" : "Outlook"}
                    </h2>
                    {!selectedMessage && (
                        <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} · {messages.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {!selectedMessage && (
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search emails..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="pl-8 w-36 md:w-48 h-8 text-xs bg-background"
                            />
                        </div>
                    )}
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                    </Button>
                    <Button size="sm" className="h-8 text-xs" onClick={startCompose}>
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Compose</span>
                    </Button>
                </div>
            </div>

            {/* Mobile search bar */}
            {!selectedMessage && !showCompose && (
                <div className="sm:hidden px-2 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search emails..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="pl-8 h-8 text-xs bg-muted/50 border-0 w-full"
                        />
                    </div>
                </div>
            )}

            <div className="flex gap-3 flex-1 min-h-0 px-2 md:px-0 pb-2 md:pb-0">
                {/* Folder sidebar — compact */}
                <div className="w-40 shrink-0 space-y-0.5 hidden md:block">
                    {folders.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => { setActiveFolder(f.id); setSelectedMessage(null) }}
                            className={cn(
                                "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-xs font-medium transition-colors",
                                activeFolder === f.id
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <f.icon className="w-3.5 h-3.5" />
                            <span>{f.label}</span>
                            {f.id === "inbox" && unreadCount > 0 && (
                                <Badge variant="default" className="ml-auto text-[9px] px-1.5 py-0 leading-4">
                                    {unreadCount}
                                </Badge>
                            )}
                        </button>
                    ))}
                </div>

                {/* Mobile folder tabs */}
                <div className="md:hidden flex gap-1 overflow-x-auto pb-2 -mt-2 w-full absolute left-0 px-4">
                    {folders.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => { setActiveFolder(f.id); setSelectedMessage(null) }}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                                activeFolder === f.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            <f.icon className="w-3.5 h-3.5" />
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Message list — compact */}
                <Card className={cn(
                    "flex-1 overflow-hidden",
                    selectedMessage && "hidden md:block md:max-w-[340px]",
                    showCompose && "hidden md:block md:max-w-[340px]"
                )}>
                    <div className="h-full overflow-y-auto divide-y divide-border/50">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <Mail className="w-10 h-10 text-muted-foreground/30 mb-3" />
                                <h3 className="text-sm font-semibold mb-1">No emails</h3>
                                <p className="text-xs text-muted-foreground">
                                    {searchQuery ? "No emails match your search" : `Your ${activeFolder} is empty`}
                                </p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    onClick={() => openMessage(msg)}
                                    className={cn(
                                        "flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50",
                                        selectedMessage?.id === msg.id && "bg-primary/5 border-l-2 border-primary",
                                        !msg.isRead && "bg-primary/[0.02]"
                                    )}
                                >
                                    <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                                        <AvatarFallback className={cn(
                                            "text-[10px]",
                                            !msg.isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            {getInitials(msg.from.emailAddress.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={cn(
                                                "text-xs truncate",
                                                !msg.isRead ? "font-semibold" : "font-medium text-muted-foreground"
                                            )}>
                                                {msg.from.emailAddress.name || msg.from.emailAddress.address}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap ml-auto shrink-0">
                                                {formatDistanceToNow(new Date(msg.receivedDateTime), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className={cn(
                                            "text-xs truncate mb-0.5",
                                            !msg.isRead ? "font-medium" : "text-muted-foreground"
                                        )}>
                                            {msg.subject || "(No subject)"}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground/60 truncate">
                                            {msg.bodyPreview}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            {msg.importance === "high" && (
                                                <AlertTriangle className="w-2.5 h-2.5 text-destructive" />
                                            )}
                                            {msg.hasAttachments && (
                                                <Paperclip className="w-2.5 h-2.5 text-muted-foreground/50" />
                                            )}
                                            {msg.flag?.flagStatus === "flagged" && (
                                                <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                            )}
                                            {!msg.isRead && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Message detail / compose */}
                {(selectedMessage || showCompose) && (
                    <Card className={cn("flex-1 overflow-hidden flex flex-col", !selectedMessage && !showCompose && "hidden md:flex")}>
                        {showCompose ? (
                            /* Compose view */
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between px-4 py-2.5 border-b">
                                    <h3 className="text-sm font-semibold">
                                        {showReply ? "Reply" : "New Email"}
                                    </h3>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowCompose(false); setShowReply(false) }}>
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                                    {/* To field with autocomplete */}
                                    <div ref={toRef} className="relative">
                                        <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">To</label>
                                        <Input
                                            placeholder="Start typing a name or email..."
                                            value={composeTo}
                                            onChange={(e) => handleEmailFieldChange(e.target.value, "to")}
                                            onFocus={() => { if (toSuggestions.length > 0) setShowToDropdown(true) }}
                                            className="h-8 text-xs"
                                        />
                                        {showToDropdown && toSuggestions.length > 0 && (
                                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                {toSuggestions.map((person, i) => (
                                                    <button
                                                        key={i}
                                                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                                                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(person, "to") }}
                                                    >
                                                        <Avatar className="w-6 h-6 shrink-0">
                                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                                {getInitials(person.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium truncate">{person.name}</p>
                                                            <p className="text-[10px] text-muted-foreground truncate">{person.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Cc field with autocomplete */}
                                    <div ref={ccRef} className="relative">
                                        <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Cc</label>
                                        <Input
                                            placeholder="Start typing a name or email... (optional)"
                                            value={composeCc}
                                            onChange={(e) => handleEmailFieldChange(e.target.value, "cc")}
                                            onFocus={() => { if (ccSuggestions.length > 0) setShowCcDropdown(true) }}
                                            className="h-8 text-xs"
                                        />
                                        {showCcDropdown && ccSuggestions.length > 0 && (
                                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                {ccSuggestions.map((person, i) => (
                                                    <button
                                                        key={i}
                                                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                                                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(person, "cc") }}
                                                    >
                                                        <Avatar className="w-6 h-6 shrink-0">
                                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                                {getInitials(person.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium truncate">{person.name}</p>
                                                            <p className="text-[10px] text-muted-foreground truncate">{person.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Subject</label>
                                        <Input
                                            placeholder="Email subject"
                                            value={composeSubject}
                                            onChange={(e) => setComposeSubject(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Message</label>
                                        <textarea
                                            className="w-full min-h-[180px] p-2.5 rounded-md border bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                            placeholder="Write your message..."
                                            value={composeBody}
                                            onChange={(e) => setComposeBody(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="px-3 py-2.5 border-t flex justify-end gap-2">
                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setShowCompose(false); setShowReply(false) }}>
                                        Cancel
                                    </Button>
                                    <Button size="sm" className="h-8 text-xs" onClick={handleSend} disabled={sending || !composeTo || !composeSubject || !composeBody}>
                                        {sending ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                        ) : (
                                            <Send className="w-3.5 h-3.5 mr-1.5" />
                                        )}
                                        Send
                                    </Button>
                                </div>
                            </div>
                        ) : selectedMessage ? (
                            /* Message detail view */
                            <div className="flex flex-col h-full">
                                {/* Message header */}
                                <div className="px-4 py-2.5 border-b space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-sm font-semibold flex-1 leading-tight">
                                            {selectedMessage.subject || "(No subject)"}
                                        </h3>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startReply(selectedMessage)} title="Reply">
                                                <Reply className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startForward(selectedMessage)} title="Forward">
                                                <Forward className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleRead(selectedMessage)} title={selectedMessage.isRead ? "Mark unread" : "Mark read"}>
                                                {selectedMessage.isRead ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleFlag(selectedMessage)} title="Flag">
                                                <Star className={cn("w-3.5 h-3.5", selectedMessage.flag?.flagStatus === "flagged" && "text-amber-500 fill-amber-500")} />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(selectedMessage.id)} title="Delete" className="h-7 w-7 text-destructive hover:text-destructive">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                                {getInitials(selectedMessage.from.emailAddress.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium">
                                                {selectedMessage.from.emailAddress.name}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {selectedMessage.from.emailAddress.address}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {format(new Date(selectedMessage.receivedDateTime), "PPp")}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedMessage.toRecipients && selectedMessage.toRecipients.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-medium">To:</span>{" "}
                                            {selectedMessage.toRecipients.map((r) => r.emailAddress.name || r.emailAddress.address).join(", ")}
                                        </p>
                                    )}
                                    {selectedMessage.ccRecipients && selectedMessage.ccRecipients.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-medium">Cc:</span>{" "}
                                            {selectedMessage.ccRecipients.map((r) => r.emailAddress.name || r.emailAddress.address).join(", ")}
                                        </p>
                                    )}
                                </div>

                                {/* Attachments */}
                                {attachments.length > 0 && (
                                    <div className="px-4 py-2 border-b bg-muted/30">
                                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                            <Paperclip className="w-3 h-3" />
                                            {attachments.length} attachment{attachments.length > 1 ? "s" : ""}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {attachments.map((att) => (
                                                <div
                                                    key={att.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border text-xs"
                                                >
                                                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                                                    <span className="font-medium truncate max-w-[150px]">{att.name}</span>
                                                    <span className="text-muted-foreground">
                                                        {(att.size / 1024).toFixed(0)} KB
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Message body */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    {messageLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                        </div>
                                    ) : selectedMessage.body ? (
                                        <div
                                            className="prose prose-sm dark:prose-invert max-w-none [&_img]:max-w-full [&_table]:text-xs"
                                            dangerouslySetInnerHTML={{ __html: selectedMessage.body.content }}
                                        />
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{selectedMessage.bodyPreview}</p>
                                    )}
                                </div>

                                {/* Quick reply bar */}
                                <div className="px-3 py-2 border-t">
                                    <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground text-xs h-8" onClick={() => startReply(selectedMessage)}>
                                        <Reply className="w-3.5 h-3.5 mr-1.5" />
                                        Reply to {selectedMessage.from.emailAddress.name || "sender"}...
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center">
                                <div>
                                    <MailOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">Select an email to read</p>
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                {/* Empty state for no selected message on desktop */}
                {!selectedMessage && !showCompose && (
                    <Card className="flex-1 hidden md:flex items-center justify-center">
                        <div className="text-center">
                            <MailOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                            <h3 className="text-sm font-semibold mb-1">Select an email</h3>
                            <p className="text-xs text-muted-foreground">Choose an email from the list to read it here</p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}
