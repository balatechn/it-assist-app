"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, RotateCcw } from "lucide-react"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Dashboard error:", error)
    }, [error])

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full">
                <CardContent className="pt-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            An unexpected error occurred. Please try again.
                        </p>
                    </div>
                    <Button onClick={reset} variant="outline" size="sm">
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
