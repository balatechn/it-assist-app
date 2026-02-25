import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const updateData: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        role: data.role,
        companyId: data.companyId,
    };
    if (data.password) updateData.password = data.password;

    const user = await prisma.user.update({ where: { id: params.id }, data: updateData });
    return NextResponse.json(user);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}
