import {
    FolderOpen, FileText, FileSpreadsheet, Presentation, Video, Music,
    Archive, Code, Image as ImageIcon, File as FileIcon,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface OneDriveItem {
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

export interface BreadcrumbItem {
    id: string | null
    name: string
    driveId?: string | null
}

export interface UploadItem {
    id: string
    name: string
    progress: number
    status: "uploading" | "done" | "error"
    size: number
}

export interface StorageQuota {
    used: number
    total: number
    remaining: number
    state: string
}

export type ViewMode = "grid" | "list"
export type ActiveTab = "my-files" | "shared"
export type DialogType = "none" | "new-folder" | "rename" | "share" | "move" | "delete" | "preview"

// ─── Constants ──────────────────────────────────────────────────────────────────
export const MAX_FILE_SIZE = 250 * 1024 * 1024 // 250 MB (OneDrive simple upload limit)

// ─── Helpers ────────────────────────────────────────────────────────────────────
export function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 2 : 0)} ${sizes[i]}`
}

export function formatFileDate(dateString?: string): string {
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

export function getFileExtension(name: string): string {
    return name.split(".").pop()?.toLowerCase() || ""
}

export function getFileTypeInfo(item: OneDriveItem): { icon: React.ElementType; color: string; label: string } {
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

export function isPreviewable(item: OneDriveItem): boolean {
    const ext = getFileExtension(item.name)
    return ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(ext)
}
