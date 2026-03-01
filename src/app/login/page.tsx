"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Zap, AlertCircle, Shield } from "lucide-react"

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}

function LoginContent() {
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const error = searchParams.get("error")

    const handleLogin = () => {
        setLoading(true)
        signIn("microsoft-entra-id", { callbackUrl: "/dashboard" })
    }

    return (
        <div className="min-h-screen flex">
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                </div>
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
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
                        Project &amp; task management integrated with Microsoft OneDrive. Kanban boards, Gantt charts, and real-time file collaboration.
                    </p>
                    <div className="mt-12 space-y-4">
                        {["Kanban & Gantt project views", "OneDrive file integration", "Role-based access control", "Real-time notifications"].map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <span className="text-sm text-blue-200/50">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-[400px] space-y-8">
                    <div className="lg:hidden flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg gradient-primary shadow-lg">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-bold">TaskFlow</span>
                            <span className="text-[10px] text-blue-500 font-bold tracking-[0.2em] uppercase ml-1">PRO</span>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Welcome to TaskFlow Pro</h2>
                        <p className="text-muted-foreground">Sign in with your organization account</p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Authentication failed. Please try again.</span>
                        </div>
                    )}

                    <Button
                        className="w-full h-12 text-base font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-3" viewBox="0 0 21 21" fill="none">
                                    <path d="M10 0H0V10H10V0Z" fill="#F25022" />
                                    <path d="M21 0H11V10H21V0Z" fill="#7FBA00" />
                                    <path d="M10 11H0V21H10V11Z" fill="#00A4EF" />
                                    <path d="M21 11H11V21H21V11Z" fill="#FFB900" />
                                </svg>
                                Sign in with Microsoft
                            </>
                        )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Secured by Microsoft Entra ID</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
