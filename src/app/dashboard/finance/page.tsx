"use client"

import { useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"

export default function FinancePage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const financeUrl = "https://finance.nationalgroupindia.com/login"

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold">Finance Approval</h1>
                    <p className="text-xs text-muted-foreground">National Group India Finance Portal</p>
                </div>
                <a
                    href={financeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/50 hover:bg-muted/50 transition-all"
                >
                    Open in new tab <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-180px)] rounded-xl border border-border/50 bg-card">
                    <p className="text-sm text-muted-foreground mb-3">
                        Finance portal cannot be displayed in an embedded view.
                    </p>
                    <a
                        href={financeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02]"
                        style={{ background: "#DAA520" }}
                    >
                        Open Finance Portal <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden border border-border/50" style={{ height: "calc(100vh - 180px)" }}>
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                            <Loader2 className="w-6 h-6 text-[#DAA520] animate-spin" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading Finance Portal...</span>
                        </div>
                    )}
                    <iframe
                        src={financeUrl}
                        className="w-full h-full border-0"
                        title="Finance Approval Portal"
                        onLoad={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true) }}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                    />
                </div>
            )}
        </div>
    )
}
