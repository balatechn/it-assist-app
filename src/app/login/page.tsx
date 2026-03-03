"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, Shield, Sparkles } from "lucide-react"

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
                <div className="w-8 h-8 border-3 border-[#e8b84a]/30 border-t-[#e8b84a] rounded-full animate-spin" />
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
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
            {/* Background — gold/dark gradient */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)' }} />

            {/* Decorative gold orbs (CSS only, no images) */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20" style={{ background: 'radial-gradient(circle, #e8b84a, transparent 70%)' }} />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-15" style={{ background: 'radial-gradient(circle, #e8b84a, transparent 70%)' }} />
            <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full blur-[80px] opacity-10" style={{ background: 'radial-gradient(circle, #f5d780, transparent 70%)' }} />

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: "linear-gradient(rgba(232,184,74,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(232,184,74,0.3) 1px, transparent 1px)",
                backgroundSize: "80px 80px",
            }} />

            {/* Main content */}
            <div className="relative z-10 w-full max-w-[960px] flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                {/* Left — Branding */}
                <div className="flex-1 text-center lg:text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.webp" alt="National Group India" className="h-12 mx-auto lg:mx-0 mb-8" />
                    <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
                        Empower Your<br />
                        <span className="bg-gradient-to-r from-[#e8b84a] via-[#f5d780] to-[#e8b84a] bg-clip-text text-transparent">Workflow</span>
                    </h1>
                    <p className="text-white/50 text-lg mb-8">Plan. Track. Collaborate. Deliver.</p>
                    <div className="hidden lg:flex flex-col gap-3">
                        {["Kanban & Gantt project views", "Microsoft 365 integration", "Role-based access control", "Real-time collaboration"].map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#e8b84a]" />
                                <span className="text-sm text-white/50">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right — Glassmorphism Login Card */}
                <div className="w-full max-w-[420px]">
                    <div
                        className="rounded-2xl p-8 md:p-10 border border-white/10 shadow-2xl shadow-black/20"
                        style={{
                            background: 'rgba(255, 255, 255, 0.07)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                        }}
                    >
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#e8b84a]/20 bg-[#e8b84a]/10 mb-5">
                                <Sparkles className="w-3.5 h-3.5 text-[#e8b84a]" />
                                <span className="text-[11px] font-semibold tracking-wide text-[#e8b84a] uppercase">Workspace</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                            <p className="text-sm text-white/40">Sign in with your organization account</p>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm mb-6 space-y-1">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span className="font-medium">Error: {error}</span>
                                </div>
                                {errorDesc && <p className="text-xs opacity-75 pl-6">{errorDesc}</p>}
                            </div>
                        )}

                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full h-13 flex items-center justify-center gap-3 rounded-xl text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 shadow-lg shadow-[#c8932e]/25 hover:shadow-xl hover:shadow-[#c8932e]/35"
                            style={{ background: 'linear-gradient(135deg, #c8932e 0%, #e8b84a 50%, #d4a044 100%)' }}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                                        <path d="M10 0H0V10H10V0Z" fill="#F25022" />
                                        <path d="M21 0H11V10H21V0Z" fill="#7FBA00" />
                                        <path d="M10 11H0V21H10V11Z" fill="#00A4EF" />
                                        <path d="M21 11H11V21H21V11Z" fill="#FFB900" />
                                    </svg>
                                    Sign in with Microsoft
                                </>
                            )}
                        </button>

                        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-white/30">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Secured by Microsoft Entra ID</span>
                        </div>
                    </div>

                    <p className="text-center text-xs text-white/20 mt-6">nationalgroupindia.com</p>
                </div>
            </div>
        </div>
    )
}
