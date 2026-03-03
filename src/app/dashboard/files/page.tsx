"use client"

import { useState, useEffect, useRef, useCallback, DragEvent } from "react"
import { signIn } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Cloud, FolderOpen, Upload, Link2, HardDrive,
    Search, Loader2, FolderPlus, Grid3X3, List, Users,
} from "lucide-react"

// ─── Local subcomponents & types ────────────────────────────────────────────────
import type { OneDriveItem, BreadcrumbItem, UploadItem, StorageQuota, ViewMode, ActiveTab, DialogType } from "./types"
import { MAX_FILE_SIZE } from "./types"
import { StorageBar } from "./storage-bar"
import { UploadProgress } from "./upload-progress"
import { BreadcrumbNav } from "./breadcrumb-nav"
import { FileGrid } from "./file-grid"
import { FileList } from "./file-list"
import { FileContextMenu } from "./context-menu"
import { FileDialogs } from "./file-dialogs"

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

        // Client-side size validation
        const oversized = filesToUpload.filter(f => f.size > MAX_FILE_SIZE)
        if (oversized.length > 0) {
            const names = oversized.map(f => f.name).join(", ")
            alert(`The following file(s) exceed the 250 MB limit and will be skipped:\n${names}`)
        }
        const validFiles = filesToUpload.filter(f => f.size <= MAX_FILE_SIZE)
        if (validFiles.length === 0) return

        const newUploads: UploadItem[] = validFiles.map(f => ({
            id: `${f.name}-${Date.now()}-${Math.random()}`,
            name: f.name,
            progress: 0,
            status: "uploading" as const,
            size: f.size,
        }))
        setUploads(prev => [...prev, ...newUploads])

        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i]
            const uploadId = newUploads[i].id

            try {
                const formData = new FormData()
                formData.append("file", file)
                formData.append("filename", file.name)
                formData.append("parentId", currentParentId || "")

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

        setTimeout(() => fetchFiles(currentParentId), 500)
        setTimeout(() => {
            setUploads(prev => prev.filter(u => u.status === "uploading"))
        }, 3000)
    }

    const handleFileSelect = () => fileInputRef.current?.click()

    // ─── Drag & Drop ────────────────────────────────────────────────────────────
    const handleDragEnter = (e: DragEvent) => {
        e.preventDefault(); e.stopPropagation()
        dragCounter.current++
        if (e.dataTransfer?.items?.length) setDragActive(true)
    }
    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault(); e.stopPropagation()
        dragCounter.current--
        if (dragCounter.current === 0) setDragActive(false)
    }
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
    const handleDrop = (e: DragEvent) => {
        e.preventDefault(); e.stopPropagation()
        setDragActive(false)
        dragCounter.current = 0
        if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files)
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
                setDialog("none"); setDialogInput(""); fetchFiles(currentParentId)
            }
        } catch { console.error("Failed to create folder") }
        finally { setDialogLoading(false) }
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
                setDialog("none"); setDialogInput(""); setSelectedItem(null); fetchFiles(currentParentId)
            }
        } catch { console.error("Failed to rename") }
        finally { setDialogLoading(false) }
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
                setDialog("none"); setSelectedItem(null); fetchFiles(currentParentId)
            }
        } catch { console.error("Failed to delete") }
        finally { setDialogLoading(false) }
    }

    const handleShare = async (item: OneDriveItem) => {
        setSelectedItem(item); setShareLink(""); setCopiedLink(false)
        setDialog("share"); setDialogLoading(true)
        try {
            const res = await fetch("/api/onedrive/files/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: item.id }),
            })
            if (res.ok) {
                const data = await res.json()
                setShareLink(data.link || item.webUrl)
            } else { setShareLink(item.webUrl) }
        } catch { setShareLink(item.webUrl) }
        finally { setDialogLoading(false) }
    }

    const copyShareLink = () => {
        navigator.clipboard.writeText(shareLink)
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
    }

    // ─── Move File ──────────────────────────────────────────────────────────────
    const openMoveDialog = async (item: OneDriveItem) => {
        setSelectedItem(item); setDialog("move")
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
        } catch { console.error("Failed to fetch folders") }
        finally { setMoveLoading(false) }
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
                setDialog("none"); setSelectedItem(null); fetchFiles(currentParentId)
            }
        } catch { console.error("Failed to move") }
        finally { setDialogLoading(false) }
    }

    // ─── Context Menu ───────────────────────────────────────────────────────────
    const handleContextMenu = (e: React.MouseEvent, item: OneDriveItem) => {
        e.preventDefault(); e.stopPropagation()
        setContextMenu({ item, x: e.clientX, y: e.clientY })
    }

    useEffect(() => {
        const close = () => setContextMenu(null)
        window.addEventListener("click", close)
        return () => window.removeEventListener("click", close)
    }, [])

    // ─── Preview ────────────────────────────────────────────────────────────────
    const openPreview = (item: OneDriveItem) => {
        setSelectedItem(item); setDialog("preview")
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
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c8932e] to-[#e8b84a] flex items-center justify-center mx-auto mb-6 shadow-lg">
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
            <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading files">
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
                    <div className="flex items-center border rounded-lg overflow-hidden" role="group" aria-label="View mode">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-white" : "hover:bg-muted"}`}
                            aria-label="List view"
                            aria-pressed={viewMode === "list"}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "hover:bg-muted"}`}
                            aria-label="Grid view"
                            aria-pressed={viewMode === "grid"}
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
            {storage && <StorageBar storage={storage} />}

            {/* ─── Tabs ──────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b" role="tablist">
                <button
                    role="tab"
                    aria-selected={activeTab === "my-files"}
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
                    role="tab"
                    aria-selected={activeTab === "shared"}
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
            <UploadProgress uploads={uploads} onClear={() => setUploads([])} />

            {/* ─── Breadcrumbs (My Files only) ───────────────────────────────── */}
            {activeTab === "my-files" && (
                <BreadcrumbNav
                    breadcrumbs={breadcrumbs}
                    onNavigate={navigateToBreadcrumb}
                    onBack={goBack}
                />
            )}

            {/* ─── File Views ────────────────────────────────────────────────── */}
            {viewMode === "grid" && (
                <FileGrid
                    files={filteredFiles}
                    onNavigateFolder={navigateToFolder}
                    onPreview={openPreview}
                    onContextMenu={handleContextMenu}
                />
            )}

            {viewMode === "list" && (
                <FileList
                    files={filteredFiles}
                    activeTab={activeTab}
                    onNavigateFolder={navigateToFolder}
                    onPreview={openPreview}
                    onShare={handleShare}
                    onContextMenu={handleContextMenu}
                />
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
                <FileContextMenu
                    item={contextMenu.item}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onOpenBrowser={(item) => window.open(item.webUrl, "_blank")}
                    onPreview={openPreview}
                    onShare={handleShare}
                    onRename={(item) => {
                        setSelectedItem(item)
                        setDialogInput(item.name)
                        setDialog("rename")
                    }}
                    onMove={openMoveDialog}
                    onDelete={(item) => {
                        setSelectedItem(item)
                        setDialog("delete")
                    }}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* ─── Dialogs ────────────────────────────────────────────────────── */}
            <FileDialogs
                dialog={dialog}
                selectedItem={selectedItem}
                dialogInput={dialogInput}
                dialogLoading={dialogLoading}
                shareLink={shareLink}
                copiedLink={copiedLink}
                moveFolders={moveFolders}
                moveBreadcrumbs={moveBreadcrumbs}
                moveLoading={moveLoading}
                onDialogInputChange={setDialogInput}
                onClose={() => { setDialog("none"); setSelectedItem(null) }}
                onCreateFolder={handleCreateFolder}
                onRename={handleRename}
                onDelete={handleDelete}
                onMove={handleMove}
                onCopyLink={copyShareLink}
                onNavigateMoveFolder={navigateMoveFolder}
                onNavigateMoveBreadcrumb={navigateMoveBreadcrumb}
            />
        </div>
    )
}
