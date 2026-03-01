import { z } from "zod"

// ═══ Project Schemas ═══

export const createProjectSchema = z.object({
    name: z.string().min(1, "Project name is required").max(200),
    description: z.string().max(2000).optional().nullable(),
    clientName: z.string().max(200).optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    budget: z.union([z.string(), z.number()]).optional().nullable(),
    status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "ON_HOLD"]).optional(),
    color: z.string().max(20).optional().nullable(),
    managerId: z.string().uuid().optional().nullable(),
})

export const updateProjectSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    clientName: z.string().max(200).optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    budget: z.union([z.string(), z.number()]).optional().nullable(),
    status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "ON_HOLD"]).optional(),
    progress: z.union([z.string(), z.number()]).optional(),
    color: z.string().max(20).optional().nullable(),
    managerId: z.string().uuid().optional().nullable(),
})

// ═══ Task Schemas ═══

export const createTaskSchema = z.object({
    title: z.string().min(1, "Title is required").max(300),
    description: z.string().max(5000).optional().nullable(),
    dueDate: z.string().optional().nullable(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
    projectId: z.string().uuid("Valid projectId is required"),
    assigneeId: z.string().uuid().optional().nullable(),
})

export const updateTaskSchema = z.object({
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(5000).optional().nullable(),
    dueDate: z.string().optional().nullable(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
    assigneeId: z.string().uuid().optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
})

export const reorderTasksSchema = z.object({
    updates: z.array(
        z.object({
            id: z.string().uuid(),
            sortOrder: z.number().int().min(0),
            status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
        })
    ).min(1, "At least one update is required"),
})

// ═══ Comment Schemas ═══

export const createCommentSchema = z.object({
    content: z.string().min(1, "Comment cannot be empty").max(5000),
})

// ═══ User Schemas ═══

export const createUserSchema = z.object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Valid email is required"),
    password: z.string().min(6, "Password must be at least 6 characters").max(100),
    role: z.enum(["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER", "VIEWER"]).optional(),
})

export const updateUserSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    role: z.enum(["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER", "VIEWER"]).optional(),
})
