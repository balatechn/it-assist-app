import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    const expenses = await prisma.expenseAccrual.findMany({
        where: { companyId: session.user.companyId },
        orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const expense = await prisma.expenseAccrual.create({
        data: {
            ...data,
            companyId: session.user.companyId,
            date: new Date(data.date),
        },
    });
    return NextResponse.json(expense);
}
