import type { Metadata } from "next"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
    title: "National Group India — IT Asset & Project Management",
    description: "Enterprise IT asset and project management platform with Microsoft 365 integration. Plan, track, and collaborate.",
    keywords: "national group india, IT management, project management, task planner, OneDrive, collaboration",
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.png" type="image/png" />
            </head>
            <body className="min-h-screen">
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
