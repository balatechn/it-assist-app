"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Zap, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react"

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
            <LoginContent />
        </Suspense>
    )
}

function LoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(searchParams.get("error") || "")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        })

        if (result?.error) {
            setError("Invalid email or password")
            setLoading(false)
        } else {
            router.push("/dashboard")
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left panel - branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
                {/* Animated background elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                    <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "2s" }} />
                </div>

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }} />

                <div className="relative z-10 flex flex-col justify-center px-16">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary shadow-lg shadow-blue-500/25">
                            <Zap className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">TaskFlow</h1>
                            <span className="text-xs text-blue-400 font-semibold tracking-[0.2em] uppercase">PRO</span>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                        Manage projects.<br />
                        <span className="gradient-text">Deliver results.</span>
                    </h2>
                    <p className="text-lg text-blue-200/60 max-w-md leading-relaxed">
                        Project & task management integrated with Microsoft OneDrive. Kanban boards, Gantt charts, and real-time file collaboration.
                    </p>

                    {/* Feature highlights */}
                    <div className="mt-12 space-y-4">
                        {[
                            "Kanban & Gantt project views",
                            "OneDrive file integration",
                            "Role-based access control",
                            "Real-time notifications",
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <span className="text-sm text-blue-200/50">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel - login form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-[400px] space-y-8">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg gradient-primary shadow-lg">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-bold">TaskFlow</span>
                            <span className="text-[10px] text-blue-500 font-bold tracking-[0.2em] uppercase ml-1">PRO</span>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                        <p className="text-muted-foreground mt-1">Sign in to your account to continue</p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@acmecorp.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 gradient-primary text-white font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Azure AD button placeholder */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full h-11"
                        onClick={() => signIn("azure-ad")}
                        type="button"
                    >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21" fill="none">
                            <path d="M10 0H0V10H10V0Z" fill="#F25022" />
                            <path d="M21 0H11V10H21V0Z" fill="#7FBA00" />
                            <path d="M10 11H0V21H10V11Z" fill="#00A4EF" />
                            <path d="M21 11H11V21H21V11Z" fill="#FFB900" />
                        </svg>
                        Microsoft 365
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                        Demo: <span className="font-mono text-foreground/70">admin@acmecorp.com</span> / <span className="font-mono text-foreground/70">admin123</span>
                    </p>
                </div>
            </div>
        </div>
    )
}
