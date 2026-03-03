"use client"

import { Progress } from "@/components/ui/progress"
import { HardDrive } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { StorageQuota } from "./types"
import { formatBytes } from "./types"

export function StorageBar({ storage }: { storage: StorageQuota }) {
    if (!storage || storage.total <= 0) return null
    const ratio = storage.used / storage.total

    return (
        <Card className="border-0 shadow-sm">
            <div className="p-4 flex items-center gap-4">
                <HardDrive className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-medium">OneDrive Storage</span>
                        <span className="text-muted-foreground">
                            {formatBytes(storage.used)} of {formatBytes(storage.total)} used
                        </span>
                    </div>
                    <Progress
                        value={ratio * 100}
                        className="h-2"
                        indicatorClassName={
                            ratio > 0.9
                                ? "bg-red-500"
                                : ratio > 0.7
                                ? "bg-amber-500"
                                : "bg-primary"
                        }
                    />
                </div>
            </div>
        </Card>
    )
}
