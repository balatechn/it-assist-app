import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    const companies = await prisma.company.findMany({
        select: { id: true, name: true, domain: true },
        orderBy: { name: "asc" },
    });
    return NextResponse.json(companies);
}
