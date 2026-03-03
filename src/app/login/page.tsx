"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, Shield, Sparkles } from "lucide-react"

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#e8e4de]">
                <div className="w-8 h-8 border-3 border-[#d4a044]/30 border-t-[#d4a044] rounded-full animate-spin" />
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
        <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Light warm-gray background */}
            <div className="absolute inset-0 bg-[#e2ddd5]" />

            {/* Large gold glassmorphic orb — top right */}
            <div
                className="absolute top-[-15%] right-[-10%] w-[420px] h-[420px] sm:w-[600px] sm:h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle at 40% 40%, #f5d780 0%, #e8b84a 35%, #d4a044 60%, rgba(200,147,46,0.3) 100%)',
                    filter: 'blur(1px)',
                    opacity: 0.85,
                }}
            />
            {/* Medium gold orb — bottom left */}
            <div
                className="absolute bottom-[-12%] left-[-8%] w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] rounded-full"
                style={{
                    background: 'radial-gradient(circle at 55% 45%, #f5d780 0%, #e8b84a 40%, #c8932e 70%, rgba(200,147,46,0.2) 100%)',
                    filter: 'blur(1px)',
                    opacity: 0.75,
                }}
            />
            {/* Small gold orb — center accent */}
            <div
                className="absolute bottom-[10%] right-[15%] w-[180px] h-[180px] sm:w-[260px] sm:h-[260px] rounded-full"
                style={{
                    background: 'radial-gradient(circle at 45% 40%, #f8e0a0 0%, #e8b84a 50%, rgba(200,147,46,0.15) 100%)',
                    filter: 'blur(1px)',
                    opacity: 0.6,
                }}
            />

            {/* White glow accent — top right area */}
            <div
                className="absolute top-[5%] right-[8%] w-[200px] h-[280px] sm:w-[280px] sm:h-[380px] rounded-[40px]"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0) 80%)',
                    filter: 'blur(20px)',
                }}
            />

            {/* Main content */}
            <div className="relative z-10 w-full max-w-[960px] flex flex-col lg:flex-row items-center gap-10 lg:gap-20">

                {/* Left — Branding */}
                <div className="flex-1 text-center lg:text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.webp" alt="National Group India" className="h-12 mx-auto lg:mx-0 mb-8" />
                    <h1 className="text-4xl md:text-5xl font-bold text-[#2c2418] leading-tight mb-4">
                        Empower Your<br />
                        <span className="bg-gradient-to-r from-[#c8932e] via-[#e8b84a] to-[#c8932e] bg-clip-text text-transparent">Workflow</span>
                    </h1>
                    <p className="text-[#7a7060] text-lg mb-8">Plan. Track. Collaborate. Deliver.</p>
                    <div className="hidden lg:flex flex-col gap-3">
                        {["Kanban & Gantt project views", "Microsoft 365 integration", "Role-based access control", "Real-time collaboration"].map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#d4a044]" />
                                <span className="text-sm text-[#8a8070]">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right — Glassmorphism Login Card */}
                <div className="w-full max-w-[420px]">
                    <div
                        className="rounded-2xl p-8 md:p-10 border border-white/40 shadow-2xl shadow-black/8"
                        style={{
                            background: 'rgba(255, 255, 255, 0.45)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                        }}
                    >
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#d4a044]/25 bg-[#d4a044]/10 mb-5">
                                <Sparkles className="w-3.5 h-3.5 text-[#c8932e]" />
                                <span className="text-[11px] font-semibold tracking-wide text-[#b07d28] uppercase">Workspace</span>
                            </div>
                            <h2 className="text-2xl font-bold text-[#2c2418] mb-2">Welcome Back</h2>
                            <p className="text-sm text-[#8a8070]">Sign in with your organization account</p>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-sm mb-6 space-y-1">
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
                            className="w-full h-13 flex items-center justify-center gap-3 rounded-xl text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 shadow-lg shadow-[#c8932e]/20 hover:shadow-xl hover:shadow-[#c8932e]/30"
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

                        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-[#a09888]">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Secured by Microsoft Entra ID</span>
                        </div>
                    </div>

                    <p className="text-center text-xs text-[#b0a898] mt-6">nationalgroupindia.com</p>
                </div>
            </div>
        </div>
    )
}
