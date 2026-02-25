import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    // SUPER_ADMIN can see all users across companies
    const where = session.user.role === "SUPER_ADMIN" ? {} : { companyId: session.user.companyId };

    const users = await prisma.user.findMany({
        where,
        include: { company: { select: { name: true } } },
        orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: data.password || "changeme",
            role: data.role,
            companyId: data.companyId,
        },
    });
    return NextResponse.json(user);
}
