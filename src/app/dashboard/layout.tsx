"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { useSession } from "next-auth/react"
import { redirect, usePathname } from "next/navigation"
import { useLayoutStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed)
    const pathname = usePathname()

    const { status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login")
        },
    })

    // Pages that can go full-screen on mobile (hide header+nav when active)
    const isFullScreenMobilePage = pathname === "/dashboard/outlook"

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading National Group India...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <div className={cn(
                "transition-all duration-300",
                sidebarCollapsed ? "md:ml-[70px]" : "md:ml-[260px]"
            )}>
                <Header />
                <main className={cn(
                    "p-3 md:p-6 pb-20 md:pb-6",
                    isFullScreenMobilePage && "mobile-fullscreen-page"
                )}>
                    {children}
                </main>
            </div>
            <MobileBottomNav />
        </div>
    )
}
