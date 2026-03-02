"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Shield } from "lucide-react"

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
    const errorDesc = searchParams.get("error_description")

    const handleLogin = () => {
        setLoading(true)
        signIn("azure-ad", { callbackUrl: "/dashboard" })
    }

    return (
        <div className="min-h-screen flex">
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2a1f10 0%, #3d2b15 40%, #1a1510 100%)' }}>
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl animate-pulse" style={{ background: 'rgba(145, 111, 68, 0.1)' }} />
                    <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ background: 'rgba(226, 191, 121, 0.08)', animationDelay: '1s' }} />
                </div>
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                }} />
                <div className="relative z-10 flex flex-col justify-center px-16">
                    <div className="flex items-center gap-4 mb-8">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.webp" alt="National Group India" className="h-12" />
                    </div>
                    <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                        IT Asset &amp; Project<br />
                        <span style={{ background: 'linear-gradient(90deg, #e2bf79, #ac8c66)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Management Platform</span>
                    </h2>
                    <p className="text-lg max-w-md leading-relaxed" style={{ color: 'rgba(226, 191, 121, 0.5)' }}>
                        One platform. Every project. Zero chaos.
                    </p>
                    <div className="mt-12 space-y-4">
                        {["Kanban & Gantt project views", "Microsoft OneDrive integration", "Microsoft To Do sync", "Role-based access control", "Real-time notifications & audit logs"].map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#e2bf79' }} />
                                <span className="text-sm" style={{ color: 'rgba(226, 191, 121, 0.45)' }}>{f}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-16 text-xs" style={{ color: 'rgba(226, 191, 121, 0.25)' }}>
                        nationalgroupindia.com
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-[400px] space-y-8">
                    <div className="lg:hidden flex items-center gap-3 mb-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.webp" alt="National Group India" className="h-10" />
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Welcome to National Group India</h2>
                        <p className="text-muted-foreground">Sign in with your organization account</p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-1">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span className="font-medium">Error: {error}</span>
                            </div>
                            {errorDesc && <p className="text-xs opacity-75 pl-6">{errorDesc}</p>}
                            <p className="text-xs opacity-75 pl-6">Callback: /api/auth/callback/azure-ad</p>
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
