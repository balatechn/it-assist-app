import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    const licenses = await prisma.softwareLicense.findMany({
        where: { companyId: session.user.companyId },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(licenses);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const license = await prisma.softwareLicense.create({
        data: {
            ...data,
            companyId: session.user.companyId,
            renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        },
    });
    return NextResponse.json(license);
}
