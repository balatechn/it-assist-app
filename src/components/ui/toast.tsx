"use client"

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react"
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────────
type ToastVariant = "success" | "error" | "warning" | "info"

interface Toast {
    id: string
    message: string
    variant: ToastVariant
    duration?: number
}

interface ToastContextType {
    toast: (message: string, variant?: ToastVariant, duration?: number) => void
    success: (message: string) => void
    error: (message: string) => void
    warning: (message: string) => void
    info: (message: string) => void
}

// ─── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextType | null>(null)

export function useToast(): ToastContextType {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>")
    return ctx
}

// ─── Icons & styles per variant ────────────────────────────────────────────────
const variantConfig: Record<ToastVariant, { icon: typeof CheckCircle2; className: string }> = {
    success: { icon: CheckCircle2, className: "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-500/20" },
    error: { icon: AlertCircle, className: "border-red-500/30 bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-100 dark:border-red-500/20" },
    warning: { icon: AlertTriangle, className: "border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-500/20" },
    info: { icon: Info, className: "border-blue-500/30 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-100 dark:border-blue-500/20" },
}

const iconColors: Record<ToastVariant, string> = {
    success: "text-emerald-600 dark:text-emerald-400",
    error: "text-red-600 dark:text-red-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400",
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const addToast = useCallback((message: string, variant: ToastVariant = "info", duration = 4000) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        setToasts(prev => [...prev.slice(-4), { id, message, variant, duration }]) // keep max 5
    }, [])

    const ctx: ToastContextType = {
        toast: addToast,
        success: (msg) => addToast(msg, "success"),
        error: (msg) => addToast(msg, "error"),
        warning: (msg) => addToast(msg, "warning"),
        info: (msg) => addToast(msg, "info"),
    }

    return (
        <ToastContext.Provider value={ctx}>
            {children}
            {/* Toast container */}
            <div
                className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none"
                role="region"
                aria-label="Notifications"
            >
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

// ─── Single Toast Item ─────────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const [exiting, setExiting] = useState(false)
    const { icon: Icon, className } = variantConfig[toast.variant]

    useEffect(() => {
        const timer = setTimeout(() => setExiting(true), toast.duration ?? 4000)
        return () => clearTimeout(timer)
    }, [toast.duration])

    useEffect(() => {
        if (exiting) {
            const timer = setTimeout(() => onDismiss(toast.id), 300)
            return () => clearTimeout(timer)
        }
    }, [exiting, onDismiss, toast.id])

    return (
        <div
            role="alert"
            className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all duration-300",
                "motion-safe:animate-in motion-safe:slide-in-from-right-full",
                exiting && "motion-safe:animate-out motion-safe:slide-out-to-right-full opacity-0",
                className
            )}
        >
            <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", iconColors[toast.variant])} />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
                onClick={() => setExiting(true)}
                className="shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Dismiss notification"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
