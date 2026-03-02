"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
    User, Building2, Shield, LogOut, Cloud, Save, Loader2,
    Users, UserPlus, Pencil, Trash2, Plus, Search, Mail,
} from "lucide-react"
import { getInitials, isSuperAdmin as checkIsSuperAdmin } from "@/lib/utils"

interface OrgUser {
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

export default function SettingsPage() {
    const { data: session, update: updateSession } = useSession()
    const isSuperAdmin = checkIsSuperAdmin(session?.user?.role || "")

    // Profile edit state
    const [profileName, setProfileName] = useState(session?.user?.name || "")
    const [savingProfile, setSavingProfile] = useState(false)
    const [profileMsg, setProfileMsg] = useState("")

    // User management state
    const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
    const [usersLoading, setUsersLoading] = useState(false)
    const [userSearch, setUserSearch] = useState("")

    // Add user dialog
    const [showAddUser, setShowAddUser] = useState(false)
    const [addName, setAddName] = useState("")
    const [addEmail, setAddEmail] = useState("")
    const [addPassword, setAddPassword] = useState("")
    const [addRole, setAddRole] = useState("EMPLOYEE")
    const [adding, setAdding] = useState(false)

    // Edit user dialog
    const [editingUser, setEditingUser] = useState<OrgUser | null>(null)
    const [editName, setEditName] = useState("")
    const [editRole, setEditRole] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isSuperAdmin) fetchOrgUsers()
    }, [isSuperAdmin])

    const fetchOrgUsers = async () => {
        setUsersLoading(true)
        try {
            const res = await fetch("/api/users")
            if (res.ok) setOrgUsers(await res.json())
        } finally {
            setUsersLoading(false)
        }
    }

    const handleAddUser = async () => {
        if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) return
        setAdding(true)
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: addName.trim(), email: addEmail.trim(), password: addPassword, role: addRole }),
            })
            if (res.ok) {
                setShowAddUser(false)
                setAddName(""); setAddEmail(""); setAddPassword(""); setAddRole("EMPLOYEE")
                fetchOrgUsers()
            } else {
                const err = await res.json()
                alert(err.error || "Failed to create user")
            }
        } finally {
            setAdding(false)
        }
    }

    const handleEditUser = async () => {
        if (!editingUser) return
        setSaving(true)
        try {
            const res = await fetch(`/api/users/${editingUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName.trim(), role: editRole }),
            })
            if (res.ok) {
                setEditingUser(null)
                fetchOrgUsers()
            } else {
                const err = await res.json()
                alert(err.error || "Failed to update user")
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteUser = async (user: OrgUser) => {
        if (!confirm(`Delete user "${user.name}"? This action cannot be undone.`)) return
        try {
            const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
            if (res.ok) fetchOrgUsers()
            else {
                const err = await res.json()
                alert(err.error || "Failed to delete user")
            }
        } catch {
            alert("Network error")
        }
    }

    const openEditUser = (user: OrgUser) => {
        setEditingUser(user)
        setEditName(user.name)
        setEditRole(user.role)
    }

    const filteredOrgUsers = orgUsers.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.role.toLowerCase().includes(userSearch.toLowerCase())
    )

    const renderRoleBadge = (role: string) => {
        switch (role) {
            case "SUPER_ADMIN":
                return <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-600 border-amber-300/30 text-[10px]">Super Admin</Badge>
            case "ADMIN":
                return <Badge className="bg-destructive/10 text-destructive text-[10px]">Admin</Badge>
            case "MANAGEMENT":
                return <Badge className="bg-purple-500/10 text-purple-500 text-[10px]">Management</Badge>
            case "MANAGER":
                return <Badge className="bg-blue-500/10 text-blue-500 text-[10px]">Manager</Badge>
            default:
                return <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px]">Employee</Badge>
        }
    }

    const handleSaveProfile = async () => {
        if (!profileName.trim()) return
        setSavingProfile(true)
        setProfileMsg("")
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: profileName.trim() }),
            })
            if (res.ok) {
                setProfileMsg("Profile updated successfully!")
                await updateSession({ name: profileName.trim() })
            } else {
                const err = await res.json()
                setProfileMsg(err.error || "Failed to update")
            }
        } catch {
            setProfileMsg("Network error")
        } finally {
            setSavingProfile(false)
        }
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
            </div>

            {/* Profile */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <User className="w-4 h-4" /> Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                                {session?.user ? getInitials(session.user.name) : "?"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                            <Badge className="mt-1 text-xs">{session?.user?.role?.replace("_", " ")}</Badge>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="profile-name" className="text-xs font-medium">Display Name</Label>
                        <div className="flex gap-2">
                            <Input
                                id="profile-name"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                size="sm"
                                onClick={handleSaveProfile}
                                disabled={savingProfile || !profileName.trim() || profileName === session?.user?.name}
                            >
                                {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </Button>
                        </div>
                        {profileMsg && (
                            <p className={`text-xs ${profileMsg.includes("success") ? "text-emerald-500" : "text-destructive"}`}>
                                {profileMsg}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Organization */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="w-4 h-4" /> Organization
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                            <p className="text-sm font-medium">{session?.user?.organizationName}</p>
                            <p className="text-xs text-muted-foreground">Current organization</p>
                        </div>
                        <Badge variant="outline" className="text-xs">Active</Badge>
                    </div>
                </CardContent>
            </Card>

            {/* User Management — Super Admin only */}
            {isSuperAdmin && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="w-4 h-4" /> User Management
                            </CardTitle>
                            <Button
                                size="sm"
                                className="gradient-primary text-white h-8"
                                onClick={() => setShowAddUser(true)}
                            >
                                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                                Add User
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                className="pl-9 bg-muted/50 border-0 h-9"
                            />
                        </div>

                        {/* User list */}
                        {usersLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            </div>
                        ) : filteredOrgUsers.length > 0 ? (
                            <div className="divide-y divide-border/50 rounded-lg border">
                                {filteredOrgUsers.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar className="w-9 h-9 shrink-0">
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                    {getInitials(user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{user.name}</p>
                                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                                    <Mail className="w-3 h-3 shrink-0" />
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {renderRoleBadge(user.role)}
                                            {user.id !== session?.user?.id && (
                                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEditUser(user)}
                                                        className="p-1.5 rounded-md hover:bg-muted"
                                                        title="Edit user"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="p-1.5 rounded-md hover:bg-destructive/10"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">
                                    {userSearch ? "No users match your search." : "No users found."}
                                </p>
                            </div>
                        )}

                        <p className="text-[10px] text-muted-foreground">
                            {orgUsers.length} total user{orgUsers.length !== 1 ? "s" : ""} in your organization
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* OneDrive Connection */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Cloud className="w-4 h-4" /> OneDrive Integration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Cloud className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Microsoft OneDrive</p>
                                <p className="text-xs text-muted-foreground">Connect to browse and attach files</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">
                            Connect
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Security */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="w-4 h-4" /> Security
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Session</p>
                            <p className="text-xs text-muted-foreground">JWT-based, expires in 24 hours</p>
                        </div>
                        <Badge variant="success" className="text-xs">Active</Badge>
                    </div>
                    <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </CardContent>
            </Card>

            {/* Add User Dialog */}
            <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>Create a new user account for your organization.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label htmlFor="add-name" className="text-xs font-medium">Full Name</Label>
                            <Input id="add-name" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="add-email" className="text-xs font-medium">Email</Label>
                            <Input id="add-email" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="john@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="add-password" className="text-xs font-medium">Password</Label>
                            <Input id="add-password" type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} placeholder="Min. 6 characters" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Role</Label>
                            <Select value={addRole} onValueChange={setAddRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                    <SelectItem value="MANAGEMENT">Management</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setShowAddUser(false)}>Cancel</Button>
                            <Button
                                size="sm"
                                onClick={handleAddUser}
                                disabled={adding || !addName.trim() || !addEmail.trim() || !addPassword.trim()}
                            >
                                {adding ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                                {adding ? "Creating..." : "Create User"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null) }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update user details and role assignment.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label htmlFor="settings-edit-name" className="text-xs font-medium">Full Name</Label>
                            <Input id="settings-edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Role</Label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                    <SelectItem value="MANAGEMENT">Management</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingUser(null)}>Cancel</Button>
                            <Button
                                size="sm"
                                onClick={handleEditUser}
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
