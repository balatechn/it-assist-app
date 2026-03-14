"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { TopNav } from "@/components/layout/top-nav"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login")
        },
    })

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
            {/* Mobile sidebar — hidden on desktop */}
            <Sidebar />
            <Header />
            <TopNav />
            <main id="main-content" className="p-3 md:p-6 pb-20 md:pb-6">
                {children}
            </main>
            <MobileBottomNav />
        </div>
    )
}
