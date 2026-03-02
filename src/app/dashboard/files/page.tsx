"use client"

import { useState, useEffect, useRef, useCallback, DragEvent } from "react"
import { signIn } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
    Cloud, FolderOpen, Upload, Link2, HardDrive, File as FileIcon,
    Search, Loader2, ArrowLeft, ChevronRight, Home, Trash2,
    Pencil, Share2, FolderInput, X, Check, Copy, Eye,
    MoreVertical, Grid3X3, List, FileText, FileSpreadsheet, Presentation,
    Image as ImageIcon, Video, Music, Archive, Code, ExternalLink,
    Users, FolderPlus, AlertCircle
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────────
interface OneDriveItem {
    id: string
    name: string
    size: number
    webUrl: string
    folder?: { childCount: number }
    file?: { mimeType: string }
    lastModifiedDateTime?: string
    lastModifiedBy?: { user?: { displayName?: string } }
    createdBy?: { user?: { displayName?: string } }
    shared?: { owner?: { user?: { displayName?: string } }; sharedDateTime?: string }
    remoteItem?: OneDriveItem
    _driveId?: string | null
    "@microsoft.graph.downloadUrl"?: string
}

interface BreadcrumbItem {
    id: string | null
    name: string
    driveId?: string | null
}

interface UploadItem {
    id: string
    name: string
    progress: number
    status: "uploading" | "done" | "error"
    size: number
}

interface StorageQuota {
    used: number
    total: number
    remaining: number
    state: string
}

type ViewMode = "grid" | "list"
type ActiveTab = "my-files" | "shared"
type DialogType = "none" | "new-folder" | "rename" | "share" | "move" | "delete" | "preview"

// ─── Helpers ────────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 2 : 0)} ${sizes[i]}`
}

function formatDate(dateString?: string): string {
    if (!dateString) return ""
    const d = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function getFileExtension(name: string): string {
    return name.split(".").pop()?.toLowerCase() || ""
}

function getFileTypeInfo(item: OneDriveItem): { icon: React.ElementType; color: string; label: string } {
    if (item.folder) return { icon: FolderOpen, color: "text-amber-500", label: "Folder" }
    const ext = getFileExtension(item.name)
    const mime = item.file?.mimeType || ""

    if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext) || mime.startsWith("image/"))
        return { icon: ImageIcon, color: "text-green-500", label: "Image" }
    if (["pdf"].includes(ext) || mime === "application/pdf")
        return { icon: FileText, color: "text-red-500", label: "PDF" }
    if (["doc", "docx"].includes(ext) || mime.includes("wordprocessing"))
        return { icon: FileText, color: "text-blue-500", label: "Word" }
    if (["xls", "xlsx"].includes(ext) || mime.includes("spreadsheet"))
        return { icon: FileSpreadsheet, color: "text-emerald-600", label: "Excel" }
    if (["ppt", "pptx"].includes(ext) || mime.includes("presentation"))
        return { icon: Presentation, color: "text-orange-500", label: "PowerPoint" }
    if (["mp4", "avi", "mkv", "mov", "wmv", "webm"].includes(ext) || mime.startsWith("video/"))
        return { icon: Video, color: "text-purple-500", label: "Video" }
    if (["mp3", "wav", "flac", "aac", "ogg", "wma"].includes(ext) || mime.startsWith("audio/"))
        return { icon: Music, color: "text-pink-500", label: "Audio" }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
        return { icon: Archive, color: "text-yellow-600", label: "Archive" }
    if (["js", "ts", "tsx", "jsx", "py", "html", "css", "json", "xml", "md", "yaml", "yml", "sh", "bat", "ps1", "java", "cpp", "c", "cs", "php", "rb", "go", "rs", "swift"].includes(ext))
        return { icon: Code, color: "text-cyan-500", label: "Code" }
    if (["txt", "log", "csv", "rtf"].includes(ext))
        return { icon: FileText, color: "text-gray-500", label: "Text" }
    return { icon: FileIcon, color: "text-muted-foreground", label: ext.toUpperCase() || "File" }
}

function isPreviewable(item: OneDriveItem): boolean {
    const ext = getFileExtension(item.name)
    return ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(ext)
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function FilesPage() {
    // State
    const [loading, setLoading] = useState(true)
    const [needsAuth, setNeedsAuth] = useState(false)
    const [files, setFiles] = useState<OneDriveItem[]>([])
    const [sharedFiles, setSharedFiles] = useState<OneDriveItem[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: "Root" }])
    const [viewMode, setViewMode] = useState<ViewMode>("list")
    const [activeTab, setActiveTab] = useState<ActiveTab>("my-files")
    const [storage, setStorage] = useState<StorageQuota | null>(null)

    // Upload
    const [uploads, setUploads] = useState<UploadItem[]>([])
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dragCounter = useRef(0)

    // Dialogs
    const [dialog, setDialog] = useState<DialogType>("none")
    const [selectedItem, setSelectedItem] = useState<OneDriveItem | null>(null)
    const [dialogInput, setDialogInput] = useState("")
    const [dialogLoading, setDialogLoading] = useState(false)
    const [shareLink, setShareLink] = useState("")
    const [copiedLink, setCopiedLink] = useState(false)

    // Move dialog
    const [moveFolders, setMoveFolders] = useState<OneDriveItem[]>([])
    const [moveBreadcrumbs, setMoveBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: "Root" }])
    const [moveLoading, setMoveLoading] = useState(false)

    // Context menu
    const [contextMenu, setContextMenu] = useState<{ item: OneDriveItem; x: number; y: number } | null>(null)

    // ─── Data Fetching ──────────────────────────────────────────────────────────
    const currentParentId = breadcrumbs[breadcrumbs.length - 1]?.id

    const fetchFiles = useCallback(async (parentId: string | null, driveId?: string | null) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (parentId) params.set("parentId", parentId)
            if (driveId) params.set("driveId", driveId)
            const url = params.toString() ? `/api/onedrive/files?${params}` : "/api/onedrive/files"
            const res = await fetch(url)
            if (!res.ok) {
                if (res.status === 403) setNeedsAuth(true)
                return
            }
            const data = await res.json()
            setFiles(data.files || [])
        } catch {
            console.error("Failed to fetch files")
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchSharedFiles = useCallback(async () => {
        try {
            const res = await fetch("/api/onedrive/shared")
            if (res.ok) {
                const data = await res.json()
                setSharedFiles(data.files || [])
            }
        } catch {
            console.error("Failed to fetch shared files")
        }
    }, [])

    const fetchStorage = useCallback(async () => {
        try {
            const res = await fetch("/api/onedrive/storage")
            if (res.ok) {
                const data = await res.json()
                setStorage(data.quota)
            }
        } catch {
            console.error("Failed to fetch storage")
        }
    }, [])

    useEffect(() => {
        fetchFiles(null)
        fetchStorage()
    }, [fetchFiles, fetchStorage])

    useEffect(() => {
        if (activeTab === "shared" && sharedFiles.length === 0) {
            fetchSharedFiles()
        }
    }, [activeTab, sharedFiles.length, fetchSharedFiles])

    // ─── Navigation ─────────────────────────────────────────────────────────────
    const navigateToFolder = (item: OneDriveItem) => {
        const driveId = item._driveId || null
        setBreadcrumbs(prev => [...prev, { id: item.id, name: item.name, driveId }])
        setActiveTab("my-files")
        fetchFiles(item.id, driveId)
    }

    const navigateToBreadcrumb = (index: number) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
        setBreadcrumbs(newBreadcrumbs)
        const last = newBreadcrumbs[newBreadcrumbs.length - 1]
        fetchFiles(last.id, last.driveId)
    }

    const goBack = () => {
        if (breadcrumbs.length > 1) {
            const newBreadcrumbs = breadcrumbs.slice(0, -1)
            setBreadcrumbs(newBreadcrumbs)
            const last = newBreadcrumbs[newBreadcrumbs.length - 1]
            fetchFiles(last.id, last.driveId)
        }
    }

    // ─── File Upload ────────────────────────────────────────────────────────────
    const uploadFiles = async (fileList: FileList | File[]) => {
        const filesToUpload = Array.from(fileList)
        if (filesToUpload.length === 0) return

        const newUploads: UploadItem[] = filesToUpload.map(f => ({
            id: `${f.name}-${Date.now()}-${Math.random()}`,
            name: f.name,
            progress: 0,
            status: "uploading" as const,
            size: f.size,
        }))
        setUploads(prev => [...prev, ...newUploads])

        for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i]
            const uploadId = newUploads[i].id

            try {
                // Upload via server-side proxy (avoids CORS issues)
                const formData = new FormData()
                formData.append("file", file)
                formData.append("filename", file.name)
                formData.append("parentId", currentParentId || "")

                // Use XMLHttpRequest for progress tracking
                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest()

                    xhr.upload.addEventListener("progress", (e) => {
                        if (e.lengthComputable) {
                            const progress = Math.round((e.loaded / e.total) * 100)
                            setUploads(prev =>
                                prev.map(u => u.id === uploadId ? { ...u, progress } : u)
                            )
                        }
                    })

                    xhr.addEventListener("load", () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            setUploads(prev =>
                                prev.map(u => u.id === uploadId ? { ...u, progress: 100, status: "done" } : u)
                            )
                            resolve()
                        } else {
                            reject(new Error(`Upload failed: ${xhr.status}`))
                        }
                    })

                    xhr.addEventListener("error", () => reject(new Error("Upload network error")))

                    xhr.open("POST", "/api/onedrive/files")
                    xhr.send(formData)
                })
            } catch (err) {
                console.error("Upload error:", err)
                setUploads(prev =>
                    prev.map(u => u.id === uploadId ? { ...u, status: "error" } : u)
                )
            }
        }

        // Refresh file list after uploads
        setTimeout(() => fetchFiles(currentParentId), 500)

        // Auto-dismiss completed uploads after 3s
        setTimeout(() => {
            setUploads(prev => prev.filter(u => u.status === "uploading"))
        }, 3000)
    }

    const handleFileSelect = () => fileInputRef.current?.click()

    // ─── Drag & Drop ────────────────────────────────────────────────────────────
    const handleDragEnter = (e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current++
        if (e.dataTransfer?.items?.length) setDragActive(true)
    }

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current--
        if (dragCounter.current === 0) setDragActive(false)
    }

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        dragCounter.current = 0
        if (e.dataTransfer?.files?.length) {
            uploadFiles(e.dataTransfer.files)
        }
    }

    // ─── File Actions ───────────────────────────────────────────────────────────
    const handleCreateFolder = async () => {
        if (!dialogInput.trim()) return
        setDialogLoading(true)
        try {
            const res = await fetch("/api/onedrive/files/folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: dialogInput.trim(), parentId: currentParentId }),
            })
            if (res.ok) {
                setDialog("none")
                setDialogInput("")
                fetchFiles(currentParentId)
            }
        } catch {
            console.error("Failed to create folder")
        } finally {
            setDialogLoading(false)
        }
    }

    const handleRename = async () => {
        if (!dialogInput.trim() || !selectedItem) return
        setDialogLoading(true)
        try {
            const res = await fetch("/api/onedrive/files", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: selectedItem.id, newName: dialogInput.trim() }),
            })
            if (res.ok) {
                setDialog("none")
                setDialogInput("")
                setSelectedItem(null)
                fetchFiles(currentParentId)
            }
        } catch {
            console.error("Failed to rename")
        } finally {
            setDialogLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedItem) return
        setDialogLoading(true)
        try {
            const res = await fetch("/api/onedrive/files", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: selectedItem.id }),
            })
            if (res.ok) {
                setDialog("none")
                setSelectedItem(null)
                fetchFiles(currentParentId)
            }
        } catch {
            console.error("Failed to delete")
        } finally {
            setDialogLoading(false)
        }
    }

    const handleShare = async (item: OneDriveItem) => {
        setSelectedItem(item)
        setShareLink("")
        setCopiedLink(false)
        setDialog("share")
        setDialogLoading(true)
        try {
            const res = await fetch("/api/onedrive/files/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: item.id }),
            })
            if (res.ok) {
                const data = await res.json()
                setShareLink(data.link || item.webUrl)
            } else {
                setShareLink(item.webUrl)
            }
        } catch {
            setShareLink(item.webUrl)
        } finally {
            setDialogLoading(false)
        }
    }

    const copyShareLink = () => {
        navigator.clipboard.writeText(shareLink)
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
    }

    // ─── Move File ──────────────────────────────────────────────────────────────
    const openMoveDialog = async (item: OneDriveItem) => {
        setSelectedItem(item)
        setDialog("move")
        setMoveBreadcrumbs([{ id: null, name: "Root" }])
        await fetchMoveFolders(null)
    }

    const fetchMoveFolders = async (parentId: string | null) => {
        setMoveLoading(true)
        try {
            const url = parentId ? `/api/onedrive/files?parentId=${parentId}` : "/api/onedrive/files"
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setMoveFolders((data.files || []).filter((f: OneDriveItem) => f.folder))
            }
        } catch {
            console.error("Failed to fetch folders")
        } finally {
            setMoveLoading(false)
        }
    }

    const navigateMoveFolder = (folder: OneDriveItem) => {
        setMoveBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }])
        fetchMoveFolders(folder.id)
    }

    const navigateMoveBreadcrumb = (index: number) => {
        const newBreadcrumbs = moveBreadcrumbs.slice(0, index + 1)
        setMoveBreadcrumbs(newBreadcrumbs)
        fetchMoveFolders(newBreadcrumbs[newBreadcrumbs.length - 1].id)
    }

    const handleMove = async () => {
        if (!selectedItem) return
        setDialogLoading(true)
        const destinationId = moveBreadcrumbs[moveBreadcrumbs.length - 1].id
        try {
            const res = await fetch("/api/onedrive/files/move", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: selectedItem.id, destinationId }),
            })
            if (res.ok) {
                setDialog("none")
                setSelectedItem(null)
                fetchFiles(currentParentId)
            }
        } catch {
            console.error("Failed to move")
        } finally {
            setDialogLoading(false)
        }
    }

    // ─── Context Menu ───────────────────────────────────────────────────────────
    const handleContextMenu = (e: React.MouseEvent, item: OneDriveItem) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({ item, x: e.clientX, y: e.clientY })
    }

    useEffect(() => {
        const close = () => setContextMenu(null)
        window.addEventListener("click", close)
        return () => window.removeEventListener("click", close)
    }, [])

    // ─── Preview ────────────────────────────────────────────────────────────────
    const openPreview = (item: OneDriveItem) => {
        setSelectedItem(item)
        setDialog("preview")
    }

    // ─── Filter & Display ───────────────────────────────────────────────────────
    const displayFiles = activeTab === "my-files" ? files : sharedFiles
    const filteredFiles = displayFiles.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const currentFolder = breadcrumbs[breadcrumbs.length - 1]

    // ─── Auth Screen ────────────────────────────────────────────────────────────
    if (needsAuth) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full border-0 shadow-xl bg-gradient-to-b from-card to-card/80">
                    <CardContent className="pt-10 pb-10 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#916f44] to-[#e2bf79] flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <Cloud className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Connect OneDrive</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Link your Microsoft OneDrive account to browse, upload, and manage files.
                        </p>
                        <Button className="gradient-primary text-white shadow-lg shadow-blue-500/20 mb-8" onClick={() => signIn("azure-ad")}>
                            <Link2 className="w-4 h-4 mr-2" />
                            Connect Microsoft 365
                        </Button>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            {[
                                { icon: FolderOpen, label: "Browse Folders", desc: "Navigate your files" },
                                { icon: Upload, label: "Upload Files", desc: "Drag & drop upload" },
                                { icon: HardDrive, label: "Cloud Storage", desc: "Manage from here" },
                            ].map((feature, i) => (
                                <div key={i} className="p-3 rounded-lg bg-muted/50">
                                    <feature.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                                    <p className="text-xs font-medium">{feature.label}</p>
                                    <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ─── Loading Screen ─────────────────────────────────────────────────────────
    if (loading && files.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading OneDrive files...</p>
                </div>
            </div>
        )
    }

    // ─── Main Render ────────────────────────────────────────────────────────────
    return (
        <div
            className="space-y-4 relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />

            {/* ─── Drag & Drop Overlay ───────────────────────────────────────── */}
            {dragActive && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="border-2 border-dashed border-primary rounded-2xl p-16 text-center bg-primary/5 animate-pulse">
                        <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-primary mb-2">Drop files to upload</h3>
                        <p className="text-muted-foreground">
                            Files will be uploaded to <strong>{currentFolder.name}</strong>
                        </p>
                    </div>
                </div>
            )}

            {/* ─── Header ────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">OneDrive Files</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {activeTab === "my-files"
                            ? `${files.length} items in ${currentFolder.name}`
                            : `${sharedFiles.length} shared items`}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-48 sm:w-64 bg-background"
                        />
                    </div>
                    <div className="flex items-center border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-white" : "hover:bg-muted"}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "hover:bg-muted"}`}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                    </div>
                    {activeTab === "my-files" && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => { setDialogInput(""); setDialog("new-folder") }}>
                                <FolderPlus className="w-4 h-4 mr-1.5" />
                                <span className="hidden sm:inline">New Folder</span>
                            </Button>
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={handleFileSelect}>
                                <Upload className="w-4 h-4 mr-1.5" />
                                Upload
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* ─── Storage Usage ──────────────────────────────────────────────── */}
            {storage && storage.total > 0 && (
                <Card className="border-0 shadow-sm">
                    <div className="p-4 flex items-center gap-4">
                        <HardDrive className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="font-medium">OneDrive Storage</span>
                                <span className="text-muted-foreground">
                                    {formatBytes(storage.used)} of {formatBytes(storage.total)} used
                                </span>
                            </div>
                            <Progress
                                value={(storage.used / storage.total) * 100}
                                className="h-2"
                                indicatorClassName={
                                    storage.used / storage.total > 0.9
                                        ? "bg-red-500"
                                        : storage.used / storage.total > 0.7
                                        ? "bg-amber-500"
                                        : "bg-primary"
                                }
                            />
                        </div>
                    </div>
                </Card>
            )}

            {/* ─── Tabs ──────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b">
                <button
                    onClick={() => setActiveTab("my-files")}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "my-files"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <FolderOpen className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    My Files
                </button>
                <button
                    onClick={() => setActiveTab("shared")}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "shared"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Users className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    Shared With Me
                </button>
            </div>

            {/* ─── Upload Progress ────────────────────────────────────────────── */}
            {uploads.length > 0 && (
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm font-medium px-1">
                            <span>
                                {uploads.filter(u => u.status === "uploading").length > 0
                                    ? `Uploading ${uploads.filter(u => u.status === "uploading").length} file(s)...`
                                    : "Upload complete!"
                                }
                            </span>
                            <button onClick={() => setUploads([])} className="text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {uploads.map(u => (
                            <div key={u.id} className="flex items-center gap-3 px-1">
                                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                    {u.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                    {u.status === "done" && <Check className="w-4 h-4 text-emerald-500" />}
                                    {u.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs truncate">{u.name}</p>
                                    <Progress value={u.progress} className="h-1 mt-1" />
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {u.status === "error" ? "Failed" : `${u.progress}%`}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* ─── Breadcrumbs (My Files only) ───────────────────────────────── */}
            {activeTab === "my-files" && breadcrumbs.length > 1 && (
                <div className="flex items-center gap-1 text-sm">
                    <Button variant="ghost" size="sm" onClick={goBack} className="mr-1 h-7 w-7 p-0">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    {breadcrumbs.map((crumb, i) => (
                        <span key={i} className="flex items-center gap-1">
                            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            <button
                                onClick={() => navigateToBreadcrumb(i)}
                                className={`px-1.5 py-0.5 rounded hover:bg-muted transition-colors ${
                                    i === breadcrumbs.length - 1
                                        ? "font-medium text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {i === 0 ? <Home className="w-3.5 h-3.5 inline" /> : crumb.name}
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* ─── File Grid View ────────────────────────────────────────────── */}
            {viewMode === "grid" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {filteredFiles.map(item => {
                        const typeInfo = getFileTypeInfo(item)
                        const TypeIcon = typeInfo.icon
                        return (
                            <div
                                key={item.id}
                                className={`group relative rounded-xl border bg-card hover:shadow-md transition-all p-4 text-center ${
                                    item.folder ? "cursor-pointer" : ""
                                }`}
                                onClick={() => item.folder ? navigateToFolder(item) : openPreview(item)}
                                onContextMenu={(e) => handleContextMenu(e, item)}
                            >
                                {/* Action button */}
                                <button
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                                    onClick={(e) => { e.stopPropagation(); handleContextMenu(e, item) }}
                                >
                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </button>

                                <div className={`w-12 h-12 rounded-xl ${item.folder ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted/50"} flex items-center justify-center mx-auto mb-3`}>
                                    <TypeIcon className={`w-6 h-6 ${typeInfo.color}`} />
                                </div>
                                <p className="text-sm font-medium truncate mb-1">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {item.folder ? `${item.folder.childCount} items` : formatBytes(item.size)}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ─── File List View ────────────────────────────────────────────── */}
            {viewMode === "list" && (
                <Card className="border-0 shadow-sm">
                    {/* List Header */}
                    <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground border-b bg-muted/30">
                        <div className="col-span-6">Name</div>
                        <div className="col-span-2">Modified</div>
                        <div className="col-span-2">Size</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-border/50">
                        {filteredFiles.map(item => {
                            const typeInfo = getFileTypeInfo(item)
                            const TypeIcon = typeInfo.icon
                            return (
                                <div
                                    key={item.id}
                                    className={`group flex items-center gap-3 sm:grid sm:grid-cols-12 sm:gap-4 px-4 py-3 hover:bg-muted/50 transition-colors ${
                                        item.folder ? "cursor-pointer" : ""
                                    }`}
                                    onClick={() => item.folder ? navigateToFolder(item) : openPreview(item)}
                                    onContextMenu={(e) => handleContextMenu(e, item)}
                                >
                                    {/* Name */}
                                    <div className="flex items-center gap-3 min-w-0 flex-1 sm:col-span-6">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                            item.folder ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted/50"
                                        }`}>
                                            <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground sm:hidden">
                                                {item.folder ? `${item.folder.childCount} items` : formatBytes(item.size)}
                                                {item.lastModifiedDateTime && ` · ${formatDate(item.lastModifiedDateTime)}`}
                                            </p>
                                            {activeTab === "shared" && item.shared?.owner?.user?.displayName && (
                                                <p className="text-xs text-muted-foreground">
                                                    Shared by {item.shared.owner.user.displayName}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Modified */}
                                    <div className="hidden sm:flex sm:col-span-2 items-center text-sm text-muted-foreground">
                                        {formatDate(item.lastModifiedDateTime)}
                                    </div>

                                    {/* Size */}
                                    <div className="hidden sm:flex sm:col-span-2 items-center text-sm text-muted-foreground">
                                        {item.folder ? `${item.folder.childCount} items` : formatBytes(item.size)}
                                    </div>

                                    {/* Actions */}
                                    <div className="sm:col-span-2 flex items-center justify-end gap-1 shrink-0">
                                        {item.folder ? (
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                                        ) : (
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); window.open(item.webUrl, "_blank") }}
                                                    title="Open in browser"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                                </button>
                                                <button
                                                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); handleShare(item) }}
                                                    title="Share"
                                                >
                                                    <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                </button>
                                                <button
                                                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); handleContextMenu(e, item) }}
                                                    title="More"
                                                >
                                                    <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            )}

            {/* ─── Empty State ────────────────────────────────────────────────── */}
            {filteredFiles.length === 0 && !loading && (
                <div className="text-center py-16">
                    <Cloud className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-1">
                        {searchQuery ? "No files match your search" :
                         activeTab === "shared" ? "Nothing shared with you yet" :
                         "This folder is empty"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {searchQuery ? "Try adjusting your search" :
                         activeTab === "shared" ? "Files shared with you by others will appear here" :
                         "Upload files or create a new folder to get started"}
                    </p>
                    {activeTab === "my-files" && !searchQuery && (
                        <div className="flex items-center gap-3 justify-center">
                            <Button variant="outline" onClick={() => { setDialogInput(""); setDialog("new-folder") }}>
                                <FolderPlus className="w-4 h-4 mr-1.5" />
                                New Folder
                            </Button>
                            <Button className="bg-primary text-white" onClick={handleFileSelect}>
                                <Upload className="w-4 h-4 mr-1.5" />
                                Upload Files
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Context Menu ───────────────────────────────────────────────── */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-popover border rounded-xl shadow-xl py-1.5 min-w-[180px] animate-in fade-in zoom-in-95"
                    style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 300) }}
                >
                    {contextMenu.item.webUrl && (
                        <button
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => { window.open(contextMenu.item.webUrl, "_blank"); setContextMenu(null) }}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open in Browser
                        </button>
                    )}
                    {!contextMenu.item.folder && (
                        <button
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => { openPreview(contextMenu.item); setContextMenu(null) }}
                        >
                            <Eye className="w-4 h-4" />
                            Preview
                        </button>
                    )}
                    <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => { handleShare(contextMenu.item); setContextMenu(null) }}
                    >
                        <Share2 className="w-4 h-4" />
                        Share Link
                    </button>
                    <div className="border-t my-1" />
                    <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                            setSelectedItem(contextMenu.item)
                            setDialogInput(contextMenu.item.name)
                            setDialog("rename")
                            setContextMenu(null)
                        }}
                    >
                        <Pencil className="w-4 h-4" />
                        Rename
                    </button>
                    <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => { openMoveDialog(contextMenu.item); setContextMenu(null) }}
                    >
                        <FolderInput className="w-4 h-4" />
                        Move To...
                    </button>
                    <div className="border-t my-1" />
                    <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        onClick={() => {
                            setSelectedItem(contextMenu.item)
                            setDialog("delete")
                            setContextMenu(null)
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            )}

            {/* ─── Dialog Overlay ─────────────────────────────────────────────── */}
            {dialog !== "none" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4" onClick={() => { setDialog("none"); setSelectedItem(null) }}>
                    <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95" onClick={e => e.stopPropagation()}>

                        {/* ── New Folder Dialog ── */}
                        {dialog === "new-folder" && (
                            <div className="p-6">
                                <h3 className="text-lg font-bold mb-4">Create New Folder</h3>
                                <Input
                                    placeholder="Folder name"
                                    value={dialogInput}
                                    onChange={(e) => setDialogInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                                    autoFocus
                                    className="mb-4"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setDialog("none")}>Cancel</Button>
                                    <Button
                                        className="bg-primary text-white"
                                        onClick={handleCreateFolder}
                                        disabled={!dialogInput.trim() || dialogLoading}
                                    >
                                        {dialogLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FolderPlus className="w-4 h-4 mr-1.5" />}
                                        Create
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── Rename Dialog ── */}
                        {dialog === "rename" && (
                            <div className="p-6">
                                <h3 className="text-lg font-bold mb-4">Rename</h3>
                                <Input
                                    placeholder="New name"
                                    value={dialogInput}
                                    onChange={(e) => setDialogInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleRename()}
                                    autoFocus
                                    className="mb-4"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => { setDialog("none"); setSelectedItem(null) }}>Cancel</Button>
                                    <Button
                                        className="bg-primary text-white"
                                        onClick={handleRename}
                                        disabled={!dialogInput.trim() || dialogLoading}
                                    >
                                        {dialogLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                                        Rename
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── Share Dialog ── */}
                        {dialog === "share" && (
                            <div className="p-6">
                                <h3 className="text-lg font-bold mb-2">Share Link</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {selectedItem?.name}
                                </p>
                                {dialogLoading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    </div>
                                ) : shareLink ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Input value={shareLink} readOnly className="text-xs" />
                                            <Button size="sm" variant="outline" onClick={copyShareLink}>
                                                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                        {copiedLink && <p className="text-xs text-emerald-500">Copied to clipboard!</p>}
                                    </div>
                                ) : null}
                                <div className="flex justify-end mt-4">
                                    <Button variant="outline" onClick={() => { setDialog("none"); setSelectedItem(null) }}>Close</Button>
                                </div>
                            </div>
                        )}

                        {/* ── Delete Dialog ── */}
                        {dialog === "delete" && (
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-6 h-6 text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-center mb-2">Delete {selectedItem?.folder ? "Folder" : "File"}</h3>
                                <p className="text-sm text-muted-foreground text-center mb-6">
                                    Are you sure you want to delete <strong>{selectedItem?.name}</strong>?
                                    {selectedItem?.folder && " This will delete all files inside."}
                                    {" "}This action cannot be undone.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => { setDialog("none"); setSelectedItem(null) }}>Cancel</Button>
                                    <Button
                                        className="bg-red-500 hover:bg-red-600 text-white"
                                        onClick={handleDelete}
                                        disabled={dialogLoading}
                                    >
                                        {dialogLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── Move Dialog ── */}
                        {dialog === "move" && (
                            <div className="p-6">
                                <h3 className="text-lg font-bold mb-1">Move &ldquo;{selectedItem?.name}&rdquo;</h3>
                                <p className="text-sm text-muted-foreground mb-4">Select destination folder</p>

                                {/* Move breadcrumbs */}
                                <div className="flex items-center gap-1 text-xs mb-3 flex-wrap">
                                    {moveBreadcrumbs.map((crumb, i) => (
                                        <span key={i} className="flex items-center gap-1">
                                            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                                            <button
                                                onClick={() => navigateMoveBreadcrumb(i)}
                                                className={`px-1.5 py-0.5 rounded hover:bg-muted ${
                                                    i === moveBreadcrumbs.length - 1 ? "font-medium" : "text-muted-foreground"
                                                }`}
                                            >
                                                {i === 0 ? "Root" : crumb.name}
                                            </button>
                                        </span>
                                    ))}
                                </div>

                                {/* Folder list */}
                                <div className="border rounded-lg max-h-60 overflow-y-auto mb-4">
                                    {moveLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                        </div>
                                    ) : moveFolders.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">No subfolders</p>
                                    ) : (
                                        moveFolders.filter(f => f.id !== selectedItem?.id).map(folder => (
                                            <button
                                                key={folder.id}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                                                onClick={() => navigateMoveFolder(folder)}
                                            >
                                                <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                                                <span className="text-sm truncate">{folder.name}</span>
                                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                                            </button>
                                        ))
                                    )}
                                </div>

                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-muted-foreground">
                                        Move to: <strong>{moveBreadcrumbs[moveBreadcrumbs.length - 1].name}</strong>
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => { setDialog("none"); setSelectedItem(null) }}>Cancel</Button>
                                        <Button
                                            className="bg-primary text-white"
                                            onClick={handleMove}
                                            disabled={dialogLoading}
                                        >
                                            {dialogLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FolderInput className="w-4 h-4 mr-1.5" />}
                                            Move Here
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Preview Panel ── */}
                        {dialog === "preview" && selectedItem && (
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg font-bold truncate">{selectedItem.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {getFileTypeInfo(selectedItem).label} · {formatBytes(selectedItem.size)}
                                        </p>
                                    </div>
                                    <button onClick={() => { setDialog("none"); setSelectedItem(null) }} className="p-1 hover:bg-muted rounded-md">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Image Preview */}
                                {isPreviewable(selectedItem) && selectedItem["@microsoft.graph.downloadUrl"] && (
                                    <div className="mb-4 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center max-h-64">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={selectedItem["@microsoft.graph.downloadUrl"]}
                                            alt={selectedItem.name}
                                            className="max-w-full max-h-64 object-contain"
                                        />
                                    </div>
                                )}

                                {/* File Details */}
                                <div className="space-y-2 mb-4 text-sm">
                                    <div className="flex justify-between py-1.5 border-b border-border/50">
                                        <span className="text-muted-foreground">Type</span>
                                        <span>{getFileTypeInfo(selectedItem).label}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-border/50">
                                        <span className="text-muted-foreground">Size</span>
                                        <span>{formatBytes(selectedItem.size)}</span>
                                    </div>
                                    {selectedItem.lastModifiedDateTime && (
                                        <div className="flex justify-between py-1.5 border-b border-border/50">
                                            <span className="text-muted-foreground">Modified</span>
                                            <span>{formatDate(selectedItem.lastModifiedDateTime)}</span>
                                        </div>
                                    )}
                                    {selectedItem.lastModifiedBy?.user?.displayName && (
                                        <div className="flex justify-between py-1.5 border-b border-border/50">
                                            <span className="text-muted-foreground">Modified by</span>
                                            <span>{selectedItem.lastModifiedBy.user.displayName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" className="bg-primary text-white" onClick={() => window.open(selectedItem.webUrl, "_blank")}>
                                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                        Open
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => {
                                        setDialogInput(selectedItem.name)
                                        setDialog("rename")
                                    }}>
                                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                        Rename
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => openMoveDialog(selectedItem)}>
                                        <FolderInput className="w-3.5 h-3.5 mr-1.5" />
                                        Move
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
