import { authOptions } from "@/lib/auth"
import NextAuth from "next-auth/next"
import { NextRequest } from "next/server"

const handler = NextAuth(authOptions)

// Wrap the handlers to catch and log errors
async function wrappedGet(req: NextRequest) {
    try {
        console.log("[NEXTAUTH GET]", req.nextUrl.pathname, req.nextUrl.searchParams.toString())
        return await (handler as Function)(req)
    } catch (error) {
        console.error("[NEXTAUTH GET ERROR]", error)
        throw error
    }
}

async function wrappedPost(req: NextRequest) {
    try {
        console.log("[NEXTAUTH POST]", req.nextUrl.pathname)
        return await (handler as Function)(req)
    } catch (error) {
        console.error("[NEXTAUTH POST ERROR]", error)
        throw error
    }
}

export { wrappedGet as GET, wrappedPost as POST }
