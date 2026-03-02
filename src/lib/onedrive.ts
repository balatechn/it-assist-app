import prisma from "@/lib/db"

const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!
const TENANT_ID = process.env.AZURE_AD_TENANT_ID!

// Get an access token for a user using their refresh token
export async function getAccessToken(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.msRefreshToken) return null

    try {
        const params = new URLSearchParams()
        params.append("client_id", CLIENT_ID)
        params.append("client_secret", CLIENT_SECRET)
        params.append("grant_type", "refresh_token")
        params.append("refresh_token", user.msRefreshToken)

        params.append("scope", "offline_access Files.ReadWrite.All Tasks.ReadWrite User.Read User.Read.All")

        const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
            cache: "no-store",
        })

        if (!res.ok) {
            const error = await res.json()
            console.error("Microsoft token refresh error:", error)
            return null
        }

        const data = await res.json()

        // Optionally update the refresh token if a new one is provided
        if (data.refresh_token && data.refresh_token !== user.msRefreshToken) {
            await prisma.user.update({
                where: { id: userId },
                data: { msRefreshToken: data.refresh_token }
            })
        }

        return data.access_token
    } catch (e) {
        console.error("Failed to refresh token", e)
        return null
    }
}

// Helper to make Microsoft Graph API calls
export async function fetchGraph(endpoint: string, accessToken: string, options: RequestInit = {}) {
    const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
    })

    if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        console.error("Graph API Error", error)
        throw new Error(`Graph API error: ${res.statusText}`)
    }

    if (res.status === 204) return null
    return res.json()
}
