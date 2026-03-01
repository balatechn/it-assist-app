import { cn } from "@/lib/utils"

function Badge({
    className,
    variant = "default",
    ...props
}: React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}) {
    const variants: Record<string, string> = {
        default: "bg-primary/10 text-primary border-primary/20",
        secondary: "bg-secondary text-secondary-foreground border-secondary",
        destructive: "bg-destructive/10 text-destructive border-destructive/20",
        outline: "bg-transparent border-border text-foreground",
        success: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
        warning: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    }

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                variants[variant],
                className
            )}
            {...props}
        />
    )
}

export { Badge }
