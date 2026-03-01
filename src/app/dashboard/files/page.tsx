"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Cloud, FolderOpen, Upload, Link2, HardDrive, File as FileIcon, Search, Loader2, ArrowLeft, ChevronRight, Home } from "lucide-react"

interface OneDriveItem {
    id: string
    name: string
    size: number
    webUrl: string
    folder?: { childCount: number }
    file?: { mimeType: string }
}

interface BreadcrumbItem {
    id: string | null  // null = root
    name: string
}

export default function FilesPage() {
    const [loading, setLoading] = useState(true)
    const [needsAuth, setNeedsAuth] = useState(false)
    const [files, setFiles] = useState<OneDriveItem[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: "Root" }])

    useEffect(() => {
        fetchFiles(null)
    }, [])

    const fetchFiles = async (parentId: string | null) => {
        setLoading(true)
        try {
            const url = parentId
                ? `/api/onedrive/files?parentId=${parentId}`
                : "/api/onedrive/files"
            const res = await fetch(url)
            if (!res.ok) {
                if (res.status === 403) {
                    setNeedsAuth(true)
                }
                return
            }
            const data = await res.json()
            setFiles(data.files || [])
        } catch (e) {
            console.error("Failed to load files", e)
        } finally {
            setLoading(false)
        }
    }

    const navigateToFolder = (item: OneDriveItem) => {
        setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }])
        setSearchQuery("")
        fetchFiles(item.id)
    }

    const navigateToBreadcrumb = (index: number) => {
        const target = breadcrumbs[index]
        setBreadcrumbs(breadcrumbs.slice(0, index + 1))
        setSearchQuery("")
        fetchFiles(target.id)
    }

    const goBack = () => {
        if (breadcrumbs.length <= 1) return
        const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2]
        setBreadcrumbs(breadcrumbs.slice(0, -1))
        setSearchQuery("")
        fetchFiles(parentBreadcrumb.id)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    if (needsAuth) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">OneDrive Files</h2>
                    <p className="text-muted-foreground mt-1">Browse and manage your project files</p>
                </div>

                <Card className="border-dashed">
                    <CardContent className="py-16">
                        <div className="text-center max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                                <Cloud className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Connect OneDrive</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Link your Microsoft OneDrive account to browse, upload, and attach files to your projects and tasks.
                            </p>

                            <Button className="gradient-primary text-white shadow-lg shadow-blue-500/20 mb-8" onClick={() => signIn("azure-ad")}>
                                <Link2 className="w-4 h-4 mr-2" />
                                Connect Microsoft 365
                            </Button>

                            <div className="grid grid-cols-3 gap-4 text-center">
                                {[
                                    { icon: FolderOpen, label: "Browse Folders", desc: "Navigate your files" },
                                    { icon: Upload, label: "Upload Files", desc: "Directly to projects" },
                                    { icon: HardDrive, label: "Auto-Sync", desc: "Project folder creation" },
                                ].map((feature, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-muted/50">
                                        <feature.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                                        <p className="text-xs font-medium">{feature.label}</p>
                                        <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const currentFolder = breadcrumbs[breadcrumbs.length - 1]

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">OneDrive Files</h2>
                    <p className="text-muted-foreground mt-1">Found {files.length} items in {currentFolder.name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64 bg-background"
                        />
                    </div>
                </div>
            </div>

            {/* Breadcrumbs */}
            {breadcrumbs.length > 1 && (
                <div className="flex items-center gap-1 text-sm">
                    <Button variant="ghost" size="icon-sm" onClick={goBack} className="mr-1">
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

            <Card>
                <div className="divide-y divide-border/50">
                    {filteredFiles.map((item) => (
                        <div
                            key={item.id}
                            className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group ${
                                item.folder ? "cursor-pointer" : ""
                            }`}
                            onClick={() => item.folder && navigateToFolder(item)}
                        >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                {item.folder ? (
                                    <FolderOpen className="w-5 h-5 text-primary" />
                                ) : (
                                    <FileIcon className="w-5 h-5 text-blue-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                {item.folder ? (
                                    <p className="text-sm font-medium hover:text-primary transition-colors">
                                        {item.name}
                                    </p>
                                ) : (
                                    <a
                                        href={item.webUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {item.name}
                                    </a>
                                )}
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {item.folder
                                        ? `${item.folder.childCount} items`
                                        : `${(item.size / 1024 / 1024).toFixed(2)} MB`}
                                </p>
                            </div>
                            {item.folder && (
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                            )}
                        </div>
                    ))}

                    {filteredFiles.length === 0 && (
                        <div className="text-center py-12">
                            <Cloud className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-1">No files found</h3>
                            <p className="text-sm text-muted-foreground">
                                {searchQuery ? "Try adjusting your search" : "Your OneDrive is currently empty"}
                            </p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
