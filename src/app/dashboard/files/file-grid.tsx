"use client"

import { MoreVertical } from "lucide-react"
import type { OneDriveItem } from "./types"
import { getFileTypeInfo, formatBytes } from "./types"

interface FileGridProps {
    files: OneDriveItem[]
    onNavigateFolder: (item: OneDriveItem) => void
    onPreview: (item: OneDriveItem) => void
    onContextMenu: (e: React.MouseEvent, item: OneDriveItem) => void
}

export function FileGrid({ files, onNavigateFolder, onPreview, onContextMenu }: FileGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {files.map(item => {
                const typeInfo = getFileTypeInfo(item)
                const TypeIcon = typeInfo.icon
                return (
                    <div
                        key={item.id}
                        className={`group relative rounded-xl border bg-card hover:shadow-md transition-all p-4 text-center ${
                            item.folder ? "cursor-pointer" : ""
                        }`}
                        onClick={() => item.folder ? onNavigateFolder(item) : onPreview(item)}
                        onContextMenu={(e) => onContextMenu(e, item)}
                    >
                        {/* Action button */}
                        <button
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); onContextMenu(e, item) }}
                            aria-label={`Actions for ${item.name}`}
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
    )
}
