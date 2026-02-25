import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server"; // correct import for Server NextResponse

export default withAuth(
    function middleware(req) {
        const { token } = req.nextauth;
        const { pathname } = req.nextUrl;

        if (pathname.startsWith("/admin") && token?.role !== "SUPER_ADMIN") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: "/login",
        }
    }
);

export const config = {
    matcher: ["/dashboard/:path*", "/api/dashboard/:path*", "/admin/:path*"],
};
