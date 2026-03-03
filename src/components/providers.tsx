"use client"

import { useEffect } from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { ToastProvider } from "@/components/ui/toast"

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
                <ToastProvider>
                    <ServiceWorkerRegistrar />
                    {children}
                </ToastProvider>
            </ThemeProvider>
        </SessionProvider>
    )
}
