"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronRight, Home } from "lucide-react"
import type { BreadcrumbItem } from "./types"

interface BreadcrumbNavProps {
    breadcrumbs: BreadcrumbItem[]
    onNavigate: (index: number) => void
    onBack: () => void
}

export function BreadcrumbNav({ breadcrumbs, onNavigate, onBack }: BreadcrumbNavProps) {
    if (breadcrumbs.length <= 1) return null

    return (
        <nav aria-label="File breadcrumb" className="flex items-center gap-1 text-sm">
            <Button variant="ghost" size="sm" onClick={onBack} className="mr-1 h-7 w-7 p-0" aria-label="Go back">
                <ArrowLeft className="w-4 h-4" />
            </Button>
            {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />}
                    <button
                        onClick={() => onNavigate(i)}
                        className={`px-1.5 py-0.5 rounded hover:bg-muted transition-colors ${
                            i === breadcrumbs.length - 1
                                ? "font-medium text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                        aria-current={i === breadcrumbs.length - 1 ? "location" : undefined}
                    >
                        {i === 0 ? <Home className="w-3.5 h-3.5 inline" /> : crumb.name}
                    </button>
                </span>
            ))}
        </nav>
    )
}
