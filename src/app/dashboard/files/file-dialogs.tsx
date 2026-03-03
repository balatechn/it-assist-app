"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Loader2, FolderPlus, Check, X, Trash2, Copy, FolderInput, FolderOpen, ChevronRight, Pencil, ExternalLink,
} from "lucide-react"
import type { OneDriveItem, BreadcrumbItem, DialogType } from "./types"
import { getFileTypeInfo, formatBytes, formatFileDate, isPreviewable } from "./types"

interface FileDialogsProps {
    dialog: DialogType
    selectedItem: OneDriveItem | null
    dialogInput: string
    dialogLoading: boolean
    shareLink: string
    copiedLink: boolean
    moveFolders: OneDriveItem[]
    moveBreadcrumbs: BreadcrumbItem[]
    moveLoading: boolean
    onDialogInputChange: (val: string) => void
    onClose: () => void
    onCreateFolder: () => void
    onRename: () => void
    onDelete: () => void
    onMove: () => void
    onCopyLink: () => void
    onNavigateMoveFolder: (folder: OneDriveItem) => void
    onNavigateMoveBreadcrumb: (index: number) => void
}

export function FileDialogs({
    dialog, selectedItem, dialogInput, dialogLoading, shareLink, copiedLink,
    moveFolders, moveBreadcrumbs, moveLoading,
    onDialogInputChange, onClose, onCreateFolder, onRename, onDelete, onMove,
    onCopyLink, onNavigateMoveFolder, onNavigateMoveBreadcrumb,
}: FileDialogsProps) {
    if (dialog === "none") return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>

                {/* ── New Folder Dialog ── */}
                {dialog === "new-folder" && (
                    <div className="p-6">
                        <h3 className="text-lg font-bold mb-4">Create New Folder</h3>
                        <Input
                            placeholder="Folder name"
                            value={dialogInput}
                            onChange={(e) => onDialogInputChange(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onCreateFolder()}
                            autoFocus
                            className="mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button
                                className="bg-primary text-white"
                                onClick={onCreateFolder}
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
                            onChange={(e) => onDialogInputChange(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onRename()}
                            autoFocus
                            className="mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button
                                className="bg-primary text-white"
                                onClick={onRename}
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
                            <div className="flex items-center justify-center py-6" role="status" aria-label="Generating share link">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : shareLink ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Input value={shareLink} readOnly className="text-xs" />
                                    <Button size="sm" variant="outline" onClick={onCopyLink} aria-label="Copy link">
                                        {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                {copiedLink && <p className="text-xs text-emerald-500">Copied to clipboard!</p>}
                            </div>
                        ) : null}
                        <div className="flex justify-end mt-4">
                            <Button variant="outline" onClick={onClose}>Close</Button>
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
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={onDelete}
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
                                        onClick={() => onNavigateMoveBreadcrumb(i)}
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
                                <div className="flex items-center justify-center py-8" role="status" aria-label="Loading folders">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                </div>
                            ) : moveFolders.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No subfolders</p>
                            ) : (
                                moveFolders.filter(f => f.id !== selectedItem?.id).map(folder => (
                                    <button
                                        key={folder.id}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                                        onClick={() => onNavigateMoveFolder(folder)}
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
                                <Button variant="outline" onClick={onClose}>Cancel</Button>
                                <Button
                                    className="bg-primary text-white"
                                    onClick={onMove}
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
                            <button onClick={onClose} className="p-1 hover:bg-muted rounded-md" aria-label="Close preview">
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
                                    <span>{formatFileDate(selectedItem.lastModifiedDateTime)}</span>
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
                                onDialogInputChange(selectedItem.name)
                                // Switch to rename — parent handles this
                            }}>
                                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                Rename
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                                // Switch to move — parent handles this
                            }}>
                                <FolderInput className="w-3.5 h-3.5 mr-1.5" />
                                Move
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
