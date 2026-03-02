import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/providers"
import "./globals.css"

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#a07d50",
    viewportFit: "cover",
}

export const metadata: Metadata = {
    title: "National Group India — IT Asset & Project Management",
    description: "Enterprise IT asset and project management platform with Microsoft 365 integration. Plan, track, and collaborate.",
    keywords: "national group india, IT management, project management, task planner, OneDrive, collaboration",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "NGI IT",
        startupImage: "/icon-512x512.png",
    },
    formatDetection: {
        telephone: false,
    },
    other: {
        "mobile-web-app-capable": "yes",
    },
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
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
                <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
            </head>
            <body className="min-h-screen">
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
