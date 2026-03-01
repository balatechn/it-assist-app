"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Search, Mail, FolderKanban, CheckSquare, Users, Plus, Pencil, Trash2, Loader2, UserPlus } from "lucide-react"
import { getInitials } from "@/lib/utils"

interface User {
    id: string
    name: string
    email: string
    role: string
    avatar: string | null
    createdAt: string
    _count: {
        assignedTasks: number
        managedProjects: number
    }
}

export default function TeamPage() {
    const { data: session } = useSession()
    const isAdmin = session?.user?.role === "ADMIN"
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Invite dialog
    const [showInvite, setShowInvite] = useState(false)
    const [inviting, setInviting] = useState(false)
    const [inviteName, setInviteName] = useState("")
    const [inviteEmail, setInviteEmail] = useState("")
    const [invitePassword, setInvitePassword] = useState("")
    const [inviteRole, setInviteRole] = useState("TEAM_MEMBER")

    // Edit dialog
    const [editUser, setEditUser] = useState<User | null>(null)
    const [editName, setEditName] = useState("")
    const [editRole, setEditRole] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users")
            if (res.ok) {
                const data = await res.json()
                setUsers(data)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleInvite = async () => {
        if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) return
        setInviting(true)
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: inviteName.trim(),
                    email: inviteEmail.trim(),
                    password: invitePassword,
                    role: inviteRole,
                }),
            })
            if (res.ok) {
                setShowInvite(false)
                setInviteName("")
                setInviteEmail("")
                setInvitePassword("")
                setInviteRole("TEAM_MEMBER")
                fetchUsers()
            } else {
                const err = await res.json()
                alert(err.error || "Failed to create user")
            }
        } finally {
            setInviting(false)
        }
    }

    const handleEdit = async () => {
        if (!editUser) return
        setSaving(true)
        try {
            const res = await fetch(`/api/users/${editUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName.trim(), role: editRole }),
            })
            if (res.ok) {
                setEditUser(null)
                fetchUsers()
            } else {
                const err = await res.json()
                alert(err.error || "Failed to update user")
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (user: User) => {
        if (!confirm(`Delete user "${user.name}"? This action cannot be undone.`)) return
        try {
            const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
            if (res.ok) {
                fetchUsers()
            } else {
                const err = await res.json()
                alert(err.error || "Failed to delete user")
            }
        } catch {
            alert("Network error")
        }
    }

    const openEdit = (user: User) => {
        setEditUser(user)
        setEditName(user.name)
        setEditRole(user.role)
    }

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.role.toLowerCase().includes(search.toLowerCase())
    )

    const renderRoleBadge = (role: string) => {
        switch (role) {
            case "ADMIN":
                return <Badge className="bg-destructive/10 text-destructive">{role.replace("_", " ")}</Badge>
            case "PROJECT_MANAGER":
                return <Badge className="bg-blue-500/10 text-blue-500">{role.replace("_", " ")}</Badge>
            case "VIEWER":
                return <Badge className="bg-muted text-muted-foreground">{role.replace("_", " ")}</Badge>
            default:
                return <Badge className="bg-emerald-500/10 text-emerald-500">{role.replace("_", " ")}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
                    <p className="text-muted-foreground mt-1">Manage your organization&apos;s users and roles</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search members..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 w-64 bg-background"
                        />
                    </div>
                    {isAdmin && (
                        <Button
                            className="gradient-primary text-white shadow-lg shadow-blue-500/20"
                            onClick={() => setShowInvite(true)}
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add User
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse h-48 bg-muted/20" />
                    ))}
                </div>
            ) : filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((user) => (
                        <Card key={user.id} className="hover:shadow-md transition-shadow group">
                            <CardContent className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <Avatar className="w-12 h-12 ring-2 ring-background shadow-sm">
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex items-center gap-1">
                                        {renderRoleBadge(user.role)}
                                        {isAdmin && user.id !== session?.user?.id && (
                                            <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEdit(user)}
                                                    className="p-1 rounded hover:bg-muted"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="p-1 rounded hover:bg-destructive/10"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                        {user.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
                                        <Mail className="w-3.5 h-3.5" />
                                        {user.email}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-border/50">
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                                            <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{user._count.managedProjects}</p>
                                            <p className="text-[10px] text-muted-foreground">Projects</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{user._count.assignedTasks}</p>
                                            <p className="text-[10px] text-muted-foreground">Active Tasks</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-1">No members found</h3>
                        <p className="text-sm text-muted-foreground">
                            {search ? "Try adjusting your search query." : "No team members are in this organization yet."}
                        </p>
                    </CardContent>
                </Card>
            )}
            
            {/* Invite User Dialog */}
            <Dialog open={showInvite} onOpenChange={setShowInvite}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>Create a new user account for your organization.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label htmlFor="invite-name" className="text-xs font-medium">Full Name</Label>
                            <Input
                                id="invite-name"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invite-email" className="text-xs font-medium">Email</Label>
                            <Input
                                id="invite-email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invite-password" className="text-xs font-medium">Password</Label>
                            <Input
                                id="invite-password"
                                type="password"
                                value={invitePassword}
                                onChange={(e) => setInvitePassword(e.target.value)}
                                placeholder="Min. 6 characters"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Role</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TEAM_MEMBER">Team Member</SelectItem>
                                    <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="VIEWER">Viewer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
                            <Button
                                size="sm"
                                onClick={handleInvite}
                                disabled={inviting || !inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()}
                            >
                                {inviting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                                {inviting ? "Creating..." : "Create User"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null) }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update user details and role.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name" className="text-xs font-medium">Full Name</Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Role</Label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TEAM_MEMBER">Team Member</SelectItem>
                                    <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="VIEWER">Viewer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
                            <Button
                                size="sm"
                                onClick={handleEdit}
                                disabled={saving || !editName.trim()}
                            >
                                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
