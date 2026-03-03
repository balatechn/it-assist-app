"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { X, Loader2, Check, AlertCircle } from "lucide-react"
import type { UploadItem } from "./types"

interface UploadProgressProps {
    uploads: UploadItem[]
    onClear: () => void
}

export function UploadProgress({ uploads, onClear }: UploadProgressProps) {
    if (uploads.length === 0) return null

    return (
        <Card className="border-0 shadow-sm overflow-hidden">
            <div className="p-3 space-y-2">
                <div className="flex items-center justify-between text-sm font-medium px-1">
                    <span>
                        {uploads.filter(u => u.status === "uploading").length > 0
                            ? `Uploading ${uploads.filter(u => u.status === "uploading").length} file(s)...`
                            : "Upload complete!"
                        }
                    </span>
                    <button onClick={onClear} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss uploads">
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
    )
}
