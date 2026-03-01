"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    User, Building2, Shield, LogOut, Cloud, Save, Loader2, Key,
} from "lucide-react"
import { getInitials } from "@/lib/utils"

export default function SettingsPage() {
    const { data: session, update: updateSession } = useSession()

    // Profile edit state
    const [profileName, setProfileName] = useState(session?.user?.name || "")
    const [savingProfile, setSavingProfile] = useState(false)
    const [profileMsg, setProfileMsg] = useState("")

    // Password change state
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordMsg, setPasswordMsg] = useState("")

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
                // Trigger session refresh
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

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) return
        if (newPassword !== confirmPassword) {
            setPasswordMsg("Passwords don't match")
            return
        }
        if (newPassword.length < 6) {
            setPasswordMsg("Password must be at least 6 characters")
            return
        }
        setSavingPassword(true)
        setPasswordMsg("")
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            })
            if (res.ok) {
                setPasswordMsg("Password changed successfully!")
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
            } else {
                const err = await res.json()
                setPasswordMsg(err.error || "Failed to change password")
            }
        } catch {
            setPasswordMsg("Network error")
        } finally {
            setSavingPassword(false)
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

            {/* Change Password */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Key className="w-4 h-4" /> Change Password
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="current-pw" className="text-xs font-medium">Current Password</Label>
                        <Input
                            id="current-pw"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-pw" className="text-xs font-medium">New Password</Label>
                            <Input
                                id="new-pw"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-pw" className="text-xs font-medium">Confirm Password</Label>
                            <Input
                                id="confirm-pw"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat password"
                            />
                        </div>
                    </div>
                    {passwordMsg && (
                        <p className={`text-xs ${passwordMsg.includes("success") ? "text-emerald-500" : "text-destructive"}`}>
                            {passwordMsg}
                        </p>
                    )}
                    <Button
                        size="sm"
                        onClick={handleChangePassword}
                        disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                    >
                        {savingPassword ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                        {savingPassword ? "Changing..." : "Change Password"}
                    </Button>
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
        </div>
    )
}
