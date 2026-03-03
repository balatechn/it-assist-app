import nodemailer from "nodemailer"

const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@nationalgroupindia.com"
const EMAIL_LOGIN = process.env.EMAIL_LOGIN
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD
const EMAIL_SERVER = process.env.EMAIL_SERVER || "smtp.mailgun.org"
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587")

/* ── Reusable transporter (created once) ───────────────── */
let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: EMAIL_SERVER,
            port: EMAIL_PORT,
            secure: EMAIL_PORT === 465,
            auth: {
                user: EMAIL_LOGIN,
                pass: EMAIL_PASSWORD,
            },
        })
    }
    return transporter
}

/* ── Public API ────────────────────────────────────────── */

interface SendMailOptions {
    toEmail: string
    toName: string
    subject: string
    htmlBody: string
}

/**
 * Send email via Mailgun SMTP.
 */
export async function sendMail({ toEmail, toName, subject, htmlBody }: SendMailOptions): Promise<boolean> {
    try {
        if (!EMAIL_LOGIN || !EMAIL_PASSWORD) {
            console.warn("Email env vars missing — skipping email")
            return false
        }

        const transport = getTransporter()

        await transport.sendMail({
            from: `"National Group India" <${EMAIL_FROM}>`,
            to: `"${toName}" <${toEmail}>`,
            subject,
            html: htmlBody,
        })

        console.log(`Email sent to ${toEmail}: ${subject}`)
        return true
    } catch (error) {
        console.error("Failed to send email:", error)
        return false
    }
}

/**
 * Build a styled HTML email for task assignment notification.
 */
export function buildTaskAssignedEmail({
    assigneeName,
    assignerName,
    taskTitle,
    projectName,
    dueDate,
    priority,
    appUrl,
    projectId,
}: {
    assigneeName: string
    assignerName: string
    taskTitle: string
    projectName: string
    dueDate?: string | null
    priority?: string
    appUrl: string
    projectId: string
}): string {
    const priorityColor =
        priority === "CRITICAL" ? "#ef4444" :
        priority === "HIGH" ? "#f97316" :
        priority === "MEDIUM" ? "#eab308" : "#22c55e"

    const dueLine = dueDate
        ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Due Date</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td></tr>`
        : ""

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#374a60,#4a6078);padding:28px 32px;">
            <h1 style="margin:0;color:#e8b84a;font-size:18px;font-weight:700;">National Group India</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Task Assignment Notification</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;color:#2d3a4e;font-size:15px;">Hi <strong>${assigneeName}</strong>,</p>
            <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
              <strong>${assignerName}</strong> has assigned you a new task:
            </p>
            <!-- Task Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:20px;">
              <tr>
                <td style="padding:20px;">
                  <h2 style="margin:0 0 12px;color:#2d3a4e;font-size:16px;font-weight:700;">${taskTitle}</h2>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;color:#94a3b8;font-size:13px;width:90px;">Project</td>
                      <td style="padding:6px 0;font-size:13px;font-weight:600;color:#2d3a4e;">${projectName}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Priority</td>
                      <td style="padding:6px 0;">
                        <span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600;background:${priorityColor}20;color:${priorityColor};">${(priority || "MEDIUM").replace("_", " ")}</span>
                      </td>
                    </tr>
                    ${dueLine}
                  </table>
                </td>
              </tr>
            </table>
            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${appUrl}/dashboard/projects/${projectId}" target="_blank"
                   style="display:inline-block;padding:10px 28px;background:linear-gradient(135deg,#c8932e,#e8b84a);color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">
                  View Task
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">This is an automated notification from National Group India TaskFlow.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
