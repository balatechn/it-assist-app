import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    const settings = await prisma.systemSetting.findMany({
        where: { companyId: session.user.role === "SUPER_ADMIN" ? null : session.user.companyId },
    });
    return NextResponse.json(settings);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const companyId = session.user.role === "SUPER_ADMIN" ? null : session.user.companyId;

    // We are going to accept an array of settings to upsert or just a flat key/value object
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") {
            const existing = await prisma.systemSetting.findFirst({
                where: { key, companyId }
            });
            if (existing) {
                await prisma.systemSetting.update({
                    where: { id: existing.id },
                    data: { value }
                });
            } else {
                await prisma.systemSetting.create({
                    data: { key, value, companyId }
                });
            }
        }
    }

    return NextResponse.json({ success: true });
}
