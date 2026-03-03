"use client"

import { ExternalLink, Eye, Share2, Pencil, FolderInput, Trash2 } from "lucide-react"
import type { OneDriveItem } from "./types"

interface ContextMenuProps {
    item: OneDriveItem
    x: number
    y: number
    onOpenBrowser: (item: OneDriveItem) => void
    onPreview: (item: OneDriveItem) => void
    onShare: (item: OneDriveItem) => void
    onRename: (item: OneDriveItem) => void
    onMove: (item: OneDriveItem) => void
    onDelete: (item: OneDriveItem) => void
    onClose: () => void
}

export function FileContextMenu({ item, x, y, onPreview, onShare, onRename, onMove, onDelete, onClose }: ContextMenuProps) {
    return (
        <div
            className="fixed z-50 bg-popover border rounded-xl shadow-xl py-1.5 min-w-[180px] animate-in fade-in zoom-in-95"
            style={{
                left: Math.min(x, window.innerWidth - 200),
                top: Math.min(y, window.innerHeight - 300),
            }}
            role="menu"
            aria-label={`Actions for ${item.name}`}
        >
            {item.webUrl && (
                <button
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => { window.open(item.webUrl, "_blank"); onClose() }}
                >
                    <ExternalLink className="w-4 h-4" />
                    Open in Browser
                </button>
            )}
            {!item.folder && (
                <button
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => { onPreview(item); onClose() }}
                >
                    <Eye className="w-4 h-4" />
                    Preview
                </button>
            )}
            <button
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => { onShare(item); onClose() }}
            >
                <Share2 className="w-4 h-4" />
                Share Link
            </button>
            <div className="border-t my-1" />
            <button
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => { onRename(item); onClose() }}
            >
                <Pencil className="w-4 h-4" />
                Rename
            </button>
            <button
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => { onMove(item); onClose() }}
            >
                <FolderInput className="w-4 h-4" />
                Move To...
            </button>
            <div className="border-t my-1" />
            <button
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                onClick={() => { onDelete(item); onClose() }}
            >
                <Trash2 className="w-4 h-4" />
                Delete
            </button>
        </div>
    )
}
