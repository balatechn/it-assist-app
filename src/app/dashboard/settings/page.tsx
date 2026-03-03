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
    Users, UserPlus, Pencil, Trash2, Plus, Search, Mail, RefreshCw, Building, Phone, Briefcase,
} from "lucide-react"
import { getInitials, isSuperAdmin as checkIsSuperAdmin } from "@/lib/utils"
import { RoleBadge } from "@/components/shared/role-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

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

interface M365User {
    microsoftId: string
    name: string
    email: string
    jobTitle: string | null
    department: string | null
    officeLocation: string | null
    phone: string | null
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

    // Delete confirm dialog
    const [deleteTarget, setDeleteTarget] = useState<OrgUser | null>(null)
    // Error toast
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Microsoft 365 Directory
    const [showM365, setShowM365] = useState(false)
    const [m365Users, setM365Users] = useState<M365User[]>([])
    const [m365Loading, setM365Loading] = useState(false)
    const [m365Search, setM365Search] = useState("")

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

    const fetchM365Users = async () => {
        setM365Loading(true)
        try {
            const res = await fetch("/api/users/microsoft")
            if (res.ok) {
                const data = await res.json()
                setM365Users(data.users || [])
            } else {
                const err = await res.json().catch(() => ({}))
                setErrorMsg(err.error || "Failed to fetch Microsoft 365 directory")
                setTimeout(() => setErrorMsg(null), 4000)
            }
        } catch {
            setErrorMsg("Network error")
            setTimeout(() => setErrorMsg(null), 4000)
        } finally {
            setM365Loading(false)
        }
    }

    const handleSyncM365 = () => {
        setShowM365(true)
        if (m365Users.length === 0) fetchM365Users()
    }

    const m365Filtered = m365Users.filter(u =>
        u.name.toLowerCase().includes(m365Search.toLowerCase()) ||
        u.email.toLowerCase().includes(m365Search.toLowerCase()) ||
        (u.department || "").toLowerCase().includes(m365Search.toLowerCase())
    )

    const addFromM365 = (user: M365User) => {
        setAddName(user.name)
        setAddEmail(user.email)
        setAddPassword("")
        setAddRole("EMPLOYEE")
        setShowAddUser(true)
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
                setErrorMsg(err.error || "Failed to create user")
                setTimeout(() => setErrorMsg(null), 4000)
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
                setErrorMsg(err.error || "Failed to update user")
                setTimeout(() => setErrorMsg(null), 4000)
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteUser = async (user: OrgUser) => {
        try {
            const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
            if (res.ok) fetchOrgUsers()
            else {
                const err = await res.json()
                setErrorMsg(err.error || "Failed to delete user")
                setTimeout(() => setErrorMsg(null), 4000)
            }
        } catch {
            setErrorMsg("Network error")
            setTimeout(() => setErrorMsg(null), 4000)
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

    const renderRoleBadge = (role: string) => <RoleBadge role={role} />

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
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={handleSyncM365}
                            >
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                Microsoft 365
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
                                                        onClick={() => setDeleteTarget(user)}
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

                        {/* Microsoft 365 Directory */}
                        {showM365 && (
                            <div className="rounded-lg border border-blue-500/20 p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" viewBox="0 0 21 21" fill="none">
                                            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                                            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                                            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                                            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                                        </svg>
                                        <h4 className="text-xs font-semibold">Microsoft 365 Directory</h4>
                                        <Badge variant="secondary" className="text-[10px]">{m365Users.length} users</Badge>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={fetchM365Users} disabled={m365Loading}>
                                            <RefreshCw className={`w-3 h-3 ${m365Loading ? "animate-spin" : ""}`} />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setShowM365(false)}>
                                            Close
                                        </Button>
                                    </div>
                                </div>

                                {m365Loading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                    </div>
                                ) : m365Users.length > 0 ? (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                            <Input
                                                placeholder="Search directory..."
                                                value={m365Search}
                                                onChange={(e) => setM365Search(e.target.value)}
                                                className="pl-7 h-7 text-xs bg-muted/50 border-0"
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                                            {m365Filtered.map((user, i) => {
                                                const alreadyAdded = orgUsers.some(u => u.email.toLowerCase() === user.email.toLowerCase())
                                                return (
                                                    <div key={i} className="flex items-center justify-between p-2 rounded-md border border-border/50 hover:bg-muted/30 transition-all">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <Avatar className="w-8 h-8 shrink-0">
                                                                <AvatarFallback className="text-[10px] bg-blue-500/10 text-blue-500">
                                                                    {getInitials(user.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-semibold truncate">{user.name}</p>
                                                                <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                                                    <Mail className="w-2.5 h-2.5 shrink-0" />
                                                                    {user.email}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                    {user.jobTitle && (
                                                                        <span className="text-[9px] text-muted-foreground/70 flex items-center gap-0.5">
                                                                            <Briefcase className="w-2 h-2" />
                                                                            {user.jobTitle}
                                                                        </span>
                                                                    )}
                                                                    {user.department && (
                                                                        <span className="text-[9px] text-muted-foreground/70 flex items-center gap-0.5">
                                                                            <Building className="w-2 h-2" />
                                                                            {user.department}
                                                                        </span>
                                                                    )}
                                                                    {user.phone && (
                                                                        <span className="text-[9px] text-muted-foreground/70 flex items-center gap-0.5">
                                                                            <Phone className="w-2 h-2" />
                                                                            {user.phone}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 ml-2">
                                                            {alreadyAdded ? (
                                                                <Badge variant="secondary" className="text-[9px]">Added</Badge>
                                                            ) : (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-6 text-[10px] px-2"
                                                                    onClick={() => addFromM365(user)}
                                                                >
                                                                    <Plus className="w-3 h-3 mr-0.5" />
                                                                    Add
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {m365Filtered.length === 0 && (
                                            <p className="text-center text-xs text-muted-foreground py-3">No matching users found</p>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-6">
                                        <Users className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
                                        <p className="text-[10px] text-muted-foreground">No directory users found. User.Read.All permission may be needed.</p>
                                    </div>
                                )}
                            </div>
                        )}
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

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
                title="Delete User"
                description={`Delete user "${deleteTarget?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={async () => {
                    if (deleteTarget) await handleDeleteUser(deleteTarget)
                    setDeleteTarget(null)
                }}
            />

            {/* Error Toast */}
            {errorMsg && (
                <div className="fixed bottom-4 right-4 z-50 bg-destructive text-destructive-foreground px-4 py-2.5 rounded-lg shadow-lg text-sm animate-in slide-in-from-bottom-2">
                    {errorMsg}
                </div>
            )}
        </div>
    )
}
