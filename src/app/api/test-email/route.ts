import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendMail } from "@/lib/mail"
import { isSuperAdmin } from "@/lib/utils"

// GET /api/test-email — Test SMTP (Super Admin only)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || !isSuperAdmin(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const result = await sendMail({
            toEmail: session.user.email!,
            toName: session.user.name || "Admin",
            subject: "TaskFlow Email Test",
            htmlBody: `
                <div style="font-family:Segoe UI,sans-serif;padding:20px;">
                    <h2 style="color:#0f172a;">Email Test Successful!</h2>
                    <p style="color:#475569;">This confirms that SMTP is working correctly.</p>
                    <p style="color:#94a3b8;font-size:12px;">Sent from: noreply@nationalgroupindia.com</p>
                    <p style="color:#94a3b8;font-size:12px;">Time: ${new Date().toISOString()}</p>
                </div>
            `,
        })

        if (result) {
            return NextResponse.json({ success: true, message: `Test email sent to ${session.user.email}` })
        } else {
            return NextResponse.json({ success: false, message: "Email failed — check SMTP_PASS env var and server logs" }, { status: 500 })
        }
    } catch (error) {
        console.error("Test email error:", error)
        return NextResponse.json({ 
            success: false, 
            message: String(error),
        }, { status: 500 })
    }
}
