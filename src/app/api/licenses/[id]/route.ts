import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const license = await prisma.softwareLicense.update({
        where: { id: params.id },
        data: { ...data, renewalDate: data.renewalDate ? new Date(data.renewalDate) : null },
    });
    return NextResponse.json(license);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.softwareLicense.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}
