import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    const tickets = await prisma.iTRequest.findMany({
        where: { companyId: session.user.companyId },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tickets);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const ticket = await prisma.iTRequest.create({
        data: { ...data, companyId: session.user.companyId },
    });
    return NextResponse.json(ticket);
}
