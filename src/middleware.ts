import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const { pathname } = req.nextUrl

        // Protect dashboard routes
        if (pathname.startsWith("/dashboard") && !token) {
            return NextResponse.redirect(new URL("/login", req.url))
        }

        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
)

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/api/projects/:path*",
        "/api/tasks/:path*",
        "/api/users/:path*",
        "/api/notifications/:path*",
        "/api/audit-logs/:path*",
        "/api/dashboard/:path*",
        "/api/onedrive/:path*",
        "/api/files/:path*",
        "/api/search/:path*",
        "/api/profile/:path*",
    ],
}
