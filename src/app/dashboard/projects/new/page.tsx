"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Zap } from "lucide-react"
import Link from "next/link"

const PROJECT_COLORS = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
]

export default function NewProjectPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)

    // Redirect unauthorized roles
    useEffect(() => {
        if (session && session.user?.role !== "ADMIN" && session.user?.role !== "PROJECT_MANAGER") {
            router.push("/dashboard/projects")
        }
    }, [session, router])

    const [form, setForm] = useState({
        name: "",
        description: "",
        clientName: "",
        startDate: "",
        endDate: "",
        budget: "",
        status: "PLANNED",
        color: PROJECT_COLORS[0],
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })

            if (res.ok) {
                const project = await res.json()
                router.push(`/dashboard/projects/${project.id}`)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/dashboard/projects">
                    <Button variant="ghost" size="icon-sm">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Create Project</h2>
                    <p className="text-muted-foreground mt-0.5 text-sm">Set up a new project for your team</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Project Name *</label>
                            <Input
                                placeholder="e.g. Website Redesign"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                placeholder="Describe the project scope and goals..."
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[100px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Client Name</label>
                                <Input
                                    placeholder="e.g. Acme Corp"
                                    value={form.clientName}
                                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Budget (USD)</label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 50000"
                                    value={form.budget}
                                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Start Date</label>
                                <Input
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">End Date</label>
                                <Input
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                            >
                                <option value="PLANNED">Planned</option>
                                <option value="ACTIVE">Active</option>
                                <option value="ON_HOLD">On Hold</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Project Color</label>
                            <div className="flex gap-2 flex-wrap">
                                {PROJECT_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setForm({ ...form, color })}
                                        className={`w-8 h-8 rounded-full transition-all duration-200 ${form.color === color
                                            ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                                            : "hover:scale-105"
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="submit"
                                disabled={loading || !form.name}
                                className="gradient-primary text-white flex-1"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 mr-2" />
                                        Create Project
                                    </>
                                )}
                            </Button>
                            <Link href="/dashboard/projects">
                                <Button variant="outline" type="button">Cancel</Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
