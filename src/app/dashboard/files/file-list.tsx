"use client"

import { Card } from "@/components/ui/card"
import { ChevronRight, ExternalLink, Share2, MoreVertical } from "lucide-react"
import type { OneDriveItem } from "./types"
import { getFileTypeInfo, formatBytes, formatFileDate } from "./types"

interface FileListProps {
    files: OneDriveItem[]
    activeTab: "my-files" | "shared"
    onNavigateFolder: (item: OneDriveItem) => void
    onPreview: (item: OneDriveItem) => void
    onShare: (item: OneDriveItem) => void
    onContextMenu: (e: React.MouseEvent, item: OneDriveItem) => void
}

export function FileList({ files, activeTab, onNavigateFolder, onPreview, onShare, onContextMenu }: FileListProps) {
    return (
        <Card className="border-0 shadow-sm">
            {/* List Header */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground border-b bg-muted/30">
                <div className="col-span-6">Name</div>
                <div className="col-span-2">Modified</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-border/50">
                {files.map(item => {
                    const typeInfo = getFileTypeInfo(item)
                    const TypeIcon = typeInfo.icon
                    return (
                        <div
                            key={item.id}
                            className={`group flex items-center gap-3 sm:grid sm:grid-cols-12 sm:gap-4 px-4 py-3 hover:bg-muted/50 transition-colors ${
                                item.folder ? "cursor-pointer" : ""
                            }`}
                            onClick={() => item.folder ? onNavigateFolder(item) : onPreview(item)}
                            onContextMenu={(e) => onContextMenu(e, item)}
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
                                        {item.lastModifiedDateTime && ` · ${formatFileDate(item.lastModifiedDateTime)}`}
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
                                {formatFileDate(item.lastModifiedDateTime)}
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
                                            aria-label={`Open ${item.name} in browser`}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                        <button
                                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                            onClick={(e) => { e.stopPropagation(); onShare(item) }}
                                            aria-label={`Share ${item.name}`}
                                        >
                                            <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                        <button
                                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                            onClick={(e) => { e.stopPropagation(); onContextMenu(e, item) }}
                                            aria-label={`More actions for ${item.name}`}
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
    )
}
