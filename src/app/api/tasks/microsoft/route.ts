import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAccessToken, fetchGraph } from "@/lib/onedrive"

// GET /api/tasks/microsoft — Get Microsoft To Do task lists and tasks
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const accessToken = await getAccessToken(session.user.id)
        if (!accessToken) {
            return NextResponse.json({ error: "Microsoft auth required" }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const listId = searchParams.get("listId")

        if (listId) {
            // Get tasks for a specific list
            const data = await fetchGraph(
                `/me/todo/lists/${listId}/tasks?$top=50&$orderby=importance desc,createdDateTime desc`,
                accessToken
            )
            return NextResponse.json({ tasks: data.value || [] })
        }

        // Get all task lists with task counts
        const listsData = await fetchGraph("/me/todo/lists", accessToken)
        const lists = listsData.value || []

        // For the default list, also fetch tasks
        const defaultList = lists.find((l: { wellknownListName: string }) => l.wellknownListName === "defaultList") || lists[0]
        let tasks: unknown[] = []

        if (defaultList) {
            const tasksData = await fetchGraph(
                `/me/todo/lists/${defaultList.id}/tasks?$top=50&$orderby=importance desc,createdDateTime desc`,
                accessToken
            )
            tasks = tasksData.value || []
        }

        return NextResponse.json({
            lists,
            tasks,
            defaultListId: defaultList?.id || null,
        })
    } catch (error) {
        console.error("Microsoft Tasks GET error:", error)
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
    }
}

// POST /api/tasks/microsoft — Create a new task in Microsoft To Do
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const accessToken = await getAccessToken(session.user.id)
        if (!accessToken) {
            return NextResponse.json({ error: "Microsoft auth required" }, { status: 403 })
        }

        const body = await req.json()
        const { listId, title, body: taskBody, dueDate, importance } = body

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 })
        }

        // Use default list if no listId provided
        let targetListId = listId
        if (!targetListId) {
            const listsData = await fetchGraph("/me/todo/lists", accessToken)
            const defaultList = (listsData.value || []).find(
                (l: { wellknownListName: string }) => l.wellknownListName === "defaultList"
            )
            targetListId = defaultList?.id
        }

        if (!targetListId) {
            return NextResponse.json({ error: "No task list found" }, { status: 404 })
        }

        const taskData: Record<string, unknown> = {
            title,
            importance: importance || "normal",
        }
        if (taskBody) {
            taskData.body = { content: taskBody, contentType: "text" }
        }
        if (dueDate) {
            taskData.dueDateTime = {
                dateTime: new Date(dueDate).toISOString(),
                timeZone: "UTC",
            }
        }

        const task = await fetchGraph(
            `/me/todo/lists/${targetListId}/tasks`,
            accessToken,
            {
                method: "POST",
                body: JSON.stringify(taskData),
            }
        )

        return NextResponse.json(task, { status: 201 })
    } catch (error) {
        console.error("Microsoft Tasks POST error:", error)
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
    }
}

// PATCH /api/tasks/microsoft — Update a task (complete/uncomplete)
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const accessToken = await getAccessToken(session.user.id)
        if (!accessToken) {
            return NextResponse.json({ error: "Microsoft auth required" }, { status: 403 })
        }

        const body = await req.json()
        const { listId, taskId, status, title, importance } = body

        if (!listId || !taskId) {
            return NextResponse.json({ error: "listId and taskId required" }, { status: 400 })
        }

        const updateData: Record<string, unknown> = {}
        if (status) updateData.status = status
        if (title) updateData.title = title
        if (importance) updateData.importance = importance

        const task = await fetchGraph(
            `/me/todo/lists/${listId}/tasks/${taskId}`,
            accessToken,
            {
                method: "PATCH",
                body: JSON.stringify(updateData),
            }
        )

        return NextResponse.json(task)
    } catch (error) {
        console.error("Microsoft Tasks PATCH error:", error)
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
    }
}

// DELETE /api/tasks/microsoft — Delete a task
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const accessToken = await getAccessToken(session.user.id)
        if (!accessToken) {
            return NextResponse.json({ error: "Microsoft auth required" }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const listId = searchParams.get("listId")
        const taskId = searchParams.get("taskId")

        if (!listId || !taskId) {
            return NextResponse.json({ error: "listId and taskId required" }, { status: 400 })
        }

        await fetchGraph(
            `/me/todo/lists/${listId}/tasks/${taskId}`,
            accessToken,
            { method: "DELETE" }
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Microsoft Tasks DELETE error:", error)
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
    }
}
