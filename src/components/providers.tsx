"use client"

import { useEffect } from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"

function ServiceWorkerRegistrar() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((reg) => {
                    console.log("SW registered:", reg.scope)
                })
                .catch((err) => {
                    console.log("SW registration failed:", err)
                })
        }
    }, [])
    return null
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                <ServiceWorkerRegistrar />
                {children}
            </ThemeProvider>
        </SessionProvider>
    )
}
