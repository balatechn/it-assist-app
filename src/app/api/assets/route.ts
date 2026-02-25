import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    const assets = await prisma.systemAsset.findMany({
        where: { companyId: session.user.companyId },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assets);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const asset = await prisma.systemAsset.create({
        data: { ...data, companyId: session.user.companyId },
    });
    return NextResponse.json(asset);
}
