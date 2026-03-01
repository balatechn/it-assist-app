import { NextResponse } from "next/server"

export async function GET() {
    const clientId = process.env.AZURE_AD_CLIENT_ID
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET
    const tenantId = process.env.AZURE_AD_TENANT_ID
    const nextauthUrl = process.env.NEXTAUTH_URL
    const nextauthSecret = process.env.NEXTAUTH_SECRET

    // Test token endpoint reachability 
    let tokenEndpointOk = false
    let tokenError = ""
    try {
        const res = await fetch(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: clientId || "",
                    client_secret: clientSecret || "",
                    grant_type: "client_credentials",
                    scope: "https://graph.microsoft.com/.default",
                }),
            }
        )
        const data = await res.json()
        if (data.access_token) {
            tokenEndpointOk = true
        } else {
            tokenError = JSON.stringify(data)
        }
    } catch (e: unknown) {
        tokenError = e instanceof Error ? e.message : String(e)
    }

    return NextResponse.json({
        env: {
            AZURE_AD_CLIENT_ID: clientId ? `${clientId.substring(0, 8)}...` : "MISSING",
            AZURE_AD_CLIENT_SECRET: clientSecret ? `${clientSecret.substring(0, 8)}...(len=${clientSecret.length})` : "MISSING",
            AZURE_AD_TENANT_ID: tenantId ? `${tenantId.substring(0, 8)}...` : "MISSING",
            NEXTAUTH_URL: nextauthUrl || "MISSING",
            NEXTAUTH_URL_length: nextauthUrl?.length,
            NEXTAUTH_URL_hasNewline: nextauthUrl?.includes("\n") || nextauthUrl?.includes("\r"),
            NEXTAUTH_SECRET: nextauthSecret ? `set (len=${nextauthSecret.length})` : "MISSING",
        },
        tokenEndpointTest: {
            ok: tokenEndpointOk,
            error: tokenError || undefined,
        },
    })
}
