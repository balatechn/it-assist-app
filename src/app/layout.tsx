import type { Metadata } from "next"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
    title: "TaskFlow Pro — Project & Task Management",
    description: "Modern project management with Microsoft OneDrive integration. Plan, track, and collaborate with your team.",
    keywords: "project management, task planner, OneDrive, collaboration, kanban",
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="min-h-screen">
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
