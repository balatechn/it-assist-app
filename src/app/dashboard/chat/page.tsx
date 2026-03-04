"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    MessageSquare, Search, Send, Loader2, ArrowLeft, Plus, Users, User,
    RefreshCw,
} from "lucide-react"
import { cn, getInitials } from "@/lib/utils"

interface ChatPreview {
    id: string
    topic: string
    chatType: string
    otherEmail: string
    memberCount: number
    lastMessage: {
        body: string
        from: string
        createdAt: string
    } | null
    createdAt: string
}

interface ChatMessage {
    id: string
    body: string
    contentType: string
    from: { displayName: string; email: string }
    createdAt: string
    isCurrentUser: boolean
}

interface TeamMember {
    id: string
    name: string
    email: string
    role: string
    avatar: string | null
}

function timeAgo(dateStr: string) {
    const now = new Date()
    const d = new Date(dateStr)
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return "now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function formatMessageTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

export default function ChatPage() {
    const { data: session } = useSession()
    const [chats, setChats] = useState<ChatPreview[]>([])
    const [loadingChats, setLoadingChats] = useState(true)
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
    const [selectedChatTopic, setSelectedChatTopic] = useState("")
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [messageText, setMessageText] = useState("")
    const [sending, setSending] = useState(false)
    const [search, setSearch] = useState("")
    const [showNewChat, setShowNewChat] = useState(false)
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [loadingMembers, setLoadingMembers] = useState(false)
    const [memberSearch, setMemberSearch] = useState("")
    const [creatingChat, setCreatingChat] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    // Fetch chat list
    const fetchChats = useCallback(async () => {
        try {
            const res = await fetch("/api/chat")
            if (res.ok) {
                const data = await res.json()
                setChats(data)
                setError(null)
            } else {
                const err = await res.json()
                setError(err.error || "Failed to load chats")
            }
        } catch {
            setError("Network error")
        } finally {
            setLoadingChats(false)
        }
    }, [])

    useEffect(() => { fetchChats() }, [fetchChats])

    // Fetch messages for selected chat
    const fetchMessages = useCallback(async (chatId: string) => {
        setLoadingMessages(true)
        try {
            const res = await fetch(`/api/chat/${chatId}/messages`)
            if (res.ok) {
                const data = await res.json()
                setMessages(data)
                setTimeout(scrollToBottom, 100)
            }
        } finally {
            setLoadingMessages(false)
        }
    }, [])

    // Select a chat
    const selectChat = useCallback((chat: ChatPreview) => {
        setSelectedChatId(chat.id)
        setSelectedChatTopic(chat.topic)
        setMessages([])
        fetchMessages(chat.id)
    }, [fetchMessages])

    // Poll for new messages every 8 seconds when a chat is selected
    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current)
        if (selectedChatId) {
            pollRef.current = setInterval(() => {
                fetchMessages(selectedChatId)
            }, 8000)
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [selectedChatId, fetchMessages])

    // Send message
    const handleSendMessage = async () => {
        if (!messageText.trim() || !selectedChatId || sending) return
        setSending(true)
        const text = messageText.trim()
        setMessageText("")

        // Optimistic add
        const optimistic: ChatMessage = {
            id: `temp-${Date.now()}`,
            body: text,
            contentType: "text",
            from: { displayName: session?.user?.name || "You", email: "" },
            createdAt: new Date().toISOString(),
            isCurrentUser: true,
        }
        setMessages(prev => [...prev, optimistic])
        setTimeout(scrollToBottom, 50)

        try {
            await fetch(`/api/chat/${selectedChatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text }),
            })
            // Refresh messages to get the real one
            fetchMessages(selectedChatId)
        } catch {
            // Revert optimistic
            setMessages(prev => prev.filter(m => m.id !== optimistic.id))
            setMessageText(text)
        } finally {
            setSending(false)
        }
    }

    // New chat: load team members
    const openNewChat = async () => {
        setShowNewChat(true)
        setMemberSearch("")
        if (teamMembers.length === 0) {
            setLoadingMembers(true)
            try {
                const res = await fetch("/api/users")
                if (res.ok) {
                    const data = await res.json()
                    setTeamMembers(data.filter((u: TeamMember) => u.email !== session?.user?.email))
                }
            } finally {
                setLoadingMembers(false)
            }
        }
    }

    // Start 1:1 chat with a team member
    const startChatWith = async (member: TeamMember) => {
        setCreatingChat(true)
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userEmail: member.email }),
            })
            if (res.ok) {
                const data = await res.json()
                setShowNewChat(false)
                await fetchChats()
                setSelectedChatId(data.chatId)
                setSelectedChatTopic(member.name)
                fetchMessages(data.chatId)
            } else {
                const err = await res.json()
                alert(err.error || "Failed to start chat")
            }
        } finally {
            setCreatingChat(false)
        }
    }

    const filteredChats = chats.filter(c =>
        c.topic.toLowerCase().includes(search.toLowerCase())
    )

    const filteredMembers = teamMembers.filter(m =>
        m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())
    )

    return (
        <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] rounded-2xl border border-border/50 bg-card overflow-hidden">

            {/* ── Left Panel: Chat List ────────────── */}
            <div className={cn(
                "w-full md:w-80 lg:w-96 border-r border-border/50 flex flex-col shrink-0",
                selectedChatId && "hidden md:flex"
            )}>
                {/* Header */}
                <div className="p-4 border-b border-border/50">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-[#e8b84a]" />
                            <h2 className="text-lg font-bold">Teams Chat</h2>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchChats}>
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openNewChat}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search chats..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-muted/30 border-0 h-9 text-sm"
                        />
                    </div>
                </div>

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto">
                    {loadingChats ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 px-4">
                            <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm text-red-400 mb-3">{error}</p>
                            <p className="text-xs text-muted-foreground">Please sign out and sign in again to grant chat permissions.</p>
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="text-center py-20 px-4">
                            <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {search ? "No chats match your search" : "No recent chats"}
                            </p>
                            <Button variant="outline" size="sm" className="mt-3" onClick={openNewChat}>
                                <Plus className="w-3 h-3 mr-1" /> Start a Chat
                            </Button>
                        </div>
                    ) : (
                        filteredChats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => selectChat(chat)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors border-b border-border/30",
                                    selectedChatId === chat.id && "bg-muted/50"
                                )}
                            >
                                <Avatar className="w-10 h-10 shrink-0">
                                    <AvatarFallback className={cn(
                                        "text-xs font-bold",
                                        chat.chatType === "oneOnOne"
                                            ? "bg-blue-500/10 text-blue-600"
                                            : "bg-purple-500/10 text-purple-600"
                                    )}>
                                        {chat.chatType === "oneOnOne"
                                            ? getInitials(chat.topic)
                                            : <Users className="w-4 h-4" />}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium truncate">{chat.topic}</p>
                                        {chat.lastMessage && (
                                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                                {timeAgo(chat.lastMessage.createdAt)}
                                            </span>
                                        )}
                                    </div>
                                    {chat.lastMessage && (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {chat.lastMessage.from && (
                                                <span className="font-medium">{chat.lastMessage.from.split(" ")[0]}: </span>
                                            )}
                                            {chat.lastMessage.body || "Attachment"}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ── Right Panel: Messages ────────────── */}
            <div className={cn(
                "flex-1 flex flex-col",
                !selectedChatId && "hidden md:flex"
            )}>
                {selectedChatId ? (
                    <>
                        {/* Chat header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/20">
                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 md:hidden"
                                onClick={() => setSelectedChatId(null)}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <Avatar className="w-9 h-9">
                                <AvatarFallback className="bg-blue-500/10 text-blue-600 text-xs font-bold">
                                    {getInitials(selectedChatTopic)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{selectedChatTopic}</p>
                                <p className="text-[11px] text-muted-foreground">Teams Chat</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">No messages yet. Say hi!</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex",
                                            msg.isCurrentUser ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "max-w-[75%] sm:max-w-[65%]",
                                            msg.isCurrentUser ? "order-2" : "order-1"
                                        )}>
                                            {!msg.isCurrentUser && (
                                                <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">
                                                    {msg.from.displayName}
                                                </p>
                                            )}
                                            <div className={cn(
                                                "px-3 py-2 rounded-2xl text-sm leading-relaxed",
                                                msg.isCurrentUser
                                                    ? "bg-[#c8932e] text-white rounded-br-md"
                                                    : "bg-muted rounded-bl-md"
                                            )}>
                                                {msg.body}
                                            </div>
                                            <p className={cn(
                                                "text-[10px] text-muted-foreground mt-0.5",
                                                msg.isCurrentUser ? "text-right mr-1" : "ml-1"
                                            )}>
                                                {formatMessageTime(msg.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message input */}
                        <div className="px-4 py-3 border-t border-border/50 bg-muted/10">
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Type a message..."
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSendMessage()
                                        }
                                    }}
                                    className="flex-1 bg-background"
                                    disabled={sending}
                                />
                                <Button
                                    size="icon"
                                    className="gradient-primary text-white shrink-0"
                                    onClick={handleSendMessage}
                                    disabled={!messageText.trim() || sending}
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* No chat selected placeholder */
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-2xl bg-[#e8b84a]/10 flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-10 h-10 text-[#e8b84a]/60" />
                            </div>
                            <h3 className="text-lg font-semibold mb-1">Teams Chat</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mb-4">
                                Select a conversation or start a new chat with your team members.
                            </p>
                            <Button variant="outline" onClick={openNewChat}>
                                <Plus className="w-4 h-4 mr-1.5" /> New Chat
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── New Chat Modal ────────────────────── */}
            {showNewChat && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={() => !creatingChat && setShowNewChat(false)}>
                    <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b">
                            <h3 className="font-semibold">New Chat</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Select a team member to chat with</p>
                            <div className="relative mt-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search members..."
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                    className="pl-9 h-9 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingMembers ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredMembers.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-10">No members found</p>
                            ) : (
                                filteredMembers.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => startChatWith(member)}
                                        disabled={creatingChat}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                                    >
                                        <Avatar className="w-9 h-9">
                                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                {getInitials(member.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{member.name}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                                        </div>
                                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="p-3 border-t">
                            <Button variant="ghost" className="w-full" size="sm" onClick={() => setShowNewChat(false)} disabled={creatingChat}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
