"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Save, Loader2, Pencil, DollarSign,
    Calendar, User, FolderKanban,
} from "lucide-react"
import { cn, getInitials, getStatusColor } from "@/lib/utils"

interface TeamMember {
    id: string
    name: string
    email: string
    avatar: string | null
}

interface ProjectData {
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
    creator: { id: string; name: string; email: string }
    manager: { id: string; name: string; email: string } | null
}

interface ProjectEditModalProps {
    project: ProjectData | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onProjectUpdated?: () => void
}

const STATUS_OPTIONS = [
    { value: "PLANNED", label: "Planned" },
    { value: "ACTIVE", label: "Active" },
    { value: "ON_HOLD", label: "On Hold" },
    { value: "COMPLETED", label: "Completed" },
]

const COLOR_OPTIONS = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
    "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
]

export function ProjectEditModal({ project, open, onOpenChange, onProjectUpdated }: ProjectEditModalProps) {
    const { data: session } = useSession()
    const role = session?.user?.role
    const canEdit = role === "ADMIN" || role === "PROJECT_MANAGER"

    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [saving, setSaving] = useState(false)

    // Editable fields
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [clientName, setClientName] = useState("")
    const [status, setStatus] = useState("PLANNED")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [budget, setBudget] = useState("")
    const [progress, setProgress] = useState("0")
    const [color, setColor] = useState("#3B82F6")
    const [managerId, setManagerId] = useState("")

    const fetchTeamMembers = useCallback(async () => {
        try {
            const res = await fetch("/api/users")
            if (res.ok) {
                const data = await res.json()
                setTeamMembers(data)
            }
        } catch {
            // silent
        }
    }, [])

    // Populate form when project data arrives
    useEffect(() => {
        if (project && open) {
            setName(project.name)
            setDescription(project.description || "")
            setClientName(project.clientName || "")
            setStatus(project.status)
            setStartDate(project.startDate ? project.startDate.slice(0, 10) : "")
            setEndDate(project.endDate ? project.endDate.slice(0, 10) : "")
            setBudget(project.budget != null ? String(project.budget) : "")
            setProgress(String(project.progress))
            setColor(project.color || "#3B82F6")
            setManagerId(project.manager?.id || "")
            fetchTeamMembers()
        }
    }, [project, open, fetchTeamMembers])

    const handleSave = async () => {
        if (!project || !canEdit) return
        setSaving(true)

        try {
            const body: Record<string, unknown> = {
                name: name.trim(),
                description: description.trim() || null,
                clientName: clientName.trim() || null,
                status,
                startDate: startDate ? new Date(startDate).toISOString() : null,
                endDate: endDate ? new Date(endDate).toISOString() : null,
                budget: budget ? parseFloat(budget) : null,
                progress: parseInt(progress) || 0,
                color,
                managerId: managerId || null,
            }

            const res = await fetch(`/api/projects/${project.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })

            if (res.ok) {
                onProjectUpdated?.()
                onOpenChange(false)
            } else {
                const err = await res.json()
                alert(err.error || "Failed to update project")
            }
        } catch {
            alert("Network error")
        } finally {
            setSaving(false)
        }
    }

    if (!project) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                            style={{ backgroundColor: color }}
                        >
                            {name.charAt(0) || "P"}
                        </div>
                        Edit Project
                    </DialogTitle>
                    <DialogDescription>
                        Update the project details below.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="project-name" className="flex items-center gap-1.5 text-xs font-medium">
                            <FolderKanban className="w-3.5 h-3.5" /> Project Name
                        </Label>
                        <Input
                            id="project-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={!canEdit}
                            className="text-sm"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="project-desc" className="text-xs font-medium">
                            Description
                        </Label>
                        <Textarea
                            id="project-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!canEdit}
                            rows={3}
                            className="text-sm resize-none"
                            placeholder="Project description..."
                        />
                    </div>

                    {/* Client Name */}
                    <div className="space-y-2">
                        <Label htmlFor="project-client" className="text-xs font-medium">
                            Client Name
                        </Label>
                        <Input
                            id="project-client"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            disabled={!canEdit}
                            placeholder="Client name..."
                            className="text-sm"
                        />
                    </div>

                    {/* Two-column: Status + Manager */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Status</Label>
                            <Select value={status} onValueChange={setStatus} disabled={!canEdit}>
                                <SelectTrigger className="text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            <Badge className={cn("text-[10px] mr-1", getStatusColor(s.value))}>
                                                {s.label}
                                            </Badge>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-xs font-medium">
                                <User className="w-3.5 h-3.5" /> Manager
                            </Label>
                            <Select value={managerId || "none"} onValueChange={(v) => setManagerId(v === "none" ? "" : v)} disabled={!canEdit}>
                                <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {teamMembers.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            <span className="flex items-center gap-2">
                                                <Avatar className="w-4 h-4">
                                                    <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                                                        {getInitials(m.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {m.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Two-column: Start Date + End Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-xs font-medium">
                                <Calendar className="w-3.5 h-3.5" /> Start Date
                            </Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={!canEdit}
                                className="text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-xs font-medium">
                                <Calendar className="w-3.5 h-3.5" /> End Date
                            </Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                disabled={!canEdit}
                                className="text-sm"
                            />
                        </div>
                    </div>

                    {/* Two-column: Budget + Progress */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-xs font-medium">
                                <DollarSign className="w-3.5 h-3.5" /> Budget
                            </Label>
                            <Input
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                disabled={!canEdit}
                                placeholder="0.00"
                                className="text-sm"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">
                                Progress ({progress}%)
                            </Label>
                            <Input
                                type="range"
                                value={progress}
                                onChange={(e) => setProgress(e.target.value)}
                                disabled={!canEdit}
                                min="0"
                                max="100"
                                className="h-9"
                            />
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">Project Color</Label>
                        <div className="flex items-center gap-2">
                            {COLOR_OPTIONS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => canEdit && setColor(c)}
                                    className={cn(
                                        "w-7 h-7 rounded-full border-2 transition-all",
                                        color === c
                                            ? "border-foreground scale-110"
                                            : "border-transparent hover:scale-105"
                                    )}
                                    style={{ backgroundColor: c }}
                                    disabled={!canEdit}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Info row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-4">
                        <span>Created by: <strong>{project.creator.name}</strong></span>
                        {project.manager && (
                            <span>Manager: <strong>{project.manager.name}</strong></span>
                        )}
                    </div>

                    {/* Save Button */}
                    {canEdit && (
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={saving || !name.trim()}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3.5 h-3.5 mr-1.5" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
