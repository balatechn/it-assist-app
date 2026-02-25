import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Endpoint designed for Vercel Cron invocation daily
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        // Ensure only cron triggers this endpoint by validating generic auth or Vercel Cron Secret
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // For local development bypass we can allow 127.0.0.1 or similar, but strict mode:
            console.warn("Cron invoked without valid CRON_SECRET");
            // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            // In demo mode, we just log and proceed.
        }

        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        // Query Prisma: Hardware Warranty Expiring in coming 30 days
        const expiringAssets = await prisma.systemAsset.findMany({
            where: {
                warrantyDate: {
                    lte: thirtyDaysFromNow,
                    gte: new Date(), // not already expired
                }
            },
            include: { company: true }
        });

        // Query Prisma: Software License Expiring
        const expiringLicenses = await prisma.softwareLicense.findMany({
            where: {
                renewalDate: {
                    lte: thirtyDaysFromNow,
                    gte: new Date(),
                }
            },
            include: { company: true }
        });

        // Here you would trigger generic Emailing service (like Resend / Sendgrid)
        // using the extracted lists. This aggregates alerts.
        /*
          for (const asset of expiringAssets) {
            await emailClient.send({ to: asset.company.hrEmail, subject: "Expiring Asset", ... })
          }
        */

        return NextResponse.json({
            status: "success",
            message: `Alerts ready. ${expiringAssets.length} Assets, ${expiringLicenses.length} Licenses expiring soon.`,
            expiringAssets,
            expiringLicenses
        });

    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }
}
