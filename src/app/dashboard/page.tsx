import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorSmartphone, Database, LifeBuoy, CreditCard, Activity } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy load heavy chart bundle
const ExpenseChart = dynamic(() => import("@/components/charts/expense-chart"), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse bg-slate-100 rounded-xl"></div>,
});

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const companyIdFilter = session.user.companyId;

    // Utilize Prisma indexing + concurrent promises for sub-50ms fetching
    const [
        totalSystems,
        totalSoftware,
        activeRequests,
        simCount,
        monthlyExpense
    ] = await Promise.all([
        prisma.systemAsset.count({ where: { companyId: companyIdFilter } }),
        prisma.softwareLicense.count({ where: { companyId: companyIdFilter } }),
        prisma.iTRequest.count({ where: { companyId: companyIdFilter, status: "Open" } }),
        prisma.mobileSIM.count({ where: { companyId: companyIdFilter } }),
        prisma.softwareLicense.aggregate({
            where: { companyId: companyIdFilter },
            _sum: { cost: true }
        })
    ]);

    const monthlyCostScore = (monthlyExpense._sum.cost || 0) + (simCount * 30); // Demo logic assuming $30/SIM/mo

    const stats = [
        { title: "Physical Assets", value: totalSystems, icon: MonitorSmartphone, color: "bg-blue-500", shadow: "shadow-blue-500/20" },
        { title: "Software Licenses", value: totalSoftware, icon: Database, color: "bg-indigo-500", shadow: "shadow-indigo-500/20" },
        { title: "Open IT Tickets", value: activeRequests, icon: LifeBuoy, color: "bg-orange-500", shadow: "shadow-orange-500/20" },
        { title: "Est. Monthly Expense", value: `$${monthlyCostScore.toLocaleString()}`, icon: CreditCard, color: "bg-emerald-500", shadow: "shadow-emerald-500/20" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                    Executive Dashboard
                </h1>
                <p className="text-slate-500 text-sm">
                    Overview of assets, licenses, and expenses mapped to the active entity.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="border-0 shadow-lg bg-white overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50 border-b border-slate-100 p-4">
                            <CardTitle className="text-sm font-semibold tracking-tight text-slate-600">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-xl text-white shadow-lg ${stat.color} ${stat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-6">
                            <div className="text-4xl font-black text-slate-900 tracking-tighter">
                                {stat.value}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 border-0 shadow-xl p-1 rounded-2xl">
                    <CardHeader className="pb-8 pt-6 px-6">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Monthly Expense Accrual</CardTitle>
                                <p className="text-xs font-medium text-slate-500 tracking-wide mt-1">LAST 6 MONTHS IT SPEND TREND</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full pb-8">
                        <Suspense fallback={<div className="h-full w-full animate-pulse bg-slate-100 rounded-xl" />}>
                            <ExpenseChart />
                        </Suspense>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-0 shadow-xl rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Recent Priority Tickets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-black">
                                    P{i + 1}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 tracking-tight text-sm">Need Access to VPN Config</div>
                                    <div className="text-xs text-slate-500 font-medium">Reported by Sarah J. • 2h ago</div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
