// ═══ Shared Constants ═══

export const PROJECT_COLORS = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
]

export const PROJECT_TEMPLATES = [
    { name: "IT Infrastructure", description: "Server setup, network, security", color: "#3B82F6", status: "PLANNED" },
    { name: "Software Development", description: "Full SDLC with sprints", color: "#8B5CF6", status: "PLANNED" },
    { name: "Website Redesign", description: "UI/UX overhaul and deployment", color: "#EC4899", status: "PLANNED" },
    { name: "Cloud Migration", description: "On-prem to cloud transition", color: "#06B6D4", status: "PLANNED" },
    { name: "Security Audit", description: "Vulnerability assessment", color: "#EF4444", status: "PLANNED" },
    { name: "Office Setup", description: "New office IT infrastructure", color: "#F59E0B", status: "PLANNED" },
]

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"] as const

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "NOT_STARTED", "BLOCKED", "CANCELLED"] as const

export const TASK_STATUS_LABELS: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
    NOT_STARTED: "Not Started",
    BLOCKED: "Blocked",
    CANCELLED: "Cancelled",
}

export const DEPARTMENTS = [
    "IT",
    "HR",
    "Finance",
    "Marketing",
    "Sales",
    "Operations",
    "Admin",
    "Legal",
    "Support",
    "Engineering",
] as const

export const ROLE_OPTIONS = [
    { value: "EMPLOYEE", label: "Employee" },
    { value: "MANAGER", label: "Manager" },
    { value: "MANAGEMENT", label: "Management" },
    { value: "ADMIN", label: "Admin" },
    { value: "SUPER_ADMIN", label: "Super Admin" },
] as const

// External Microsoft 365 links — configurable per tenant
export const EXTERNAL_LINKS = {
    outlook: "https://outlook.office365.com",
    teams: "https://teams.microsoft.com",
    calendar: "https://outlook.office365.com/calendar",
} as const
