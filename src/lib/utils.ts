import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        COMPLETED: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
        ON_HOLD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        TODO: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400',
        IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        DONE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
}

export function getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
        LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
        MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[priority] || 'bg-gray-100 text-gray-700'
}

export function timeAgo(date: Date | string): string {
    const now = new Date()
    const past = new Date(date)
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return formatDate(date)
}
