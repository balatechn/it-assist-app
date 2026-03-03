import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700", "800"],
    display: "swap",
    variable: "--font-inter",
})

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: "#374a60",
    viewportFit: "cover",
}

export const metadata: Metadata = {
    title: "National Group India — Workspace",
    description: "Enterprise project management platform with Microsoft 365 integration. Plan, track, and collaborate.",
    keywords: "national group india, project management, task planner, OneDrive, collaboration",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "NGI",
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
            <body className={`${inter.variable} font-sans min-h-screen`}>
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
                >
                    Skip to main content
                </a>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
