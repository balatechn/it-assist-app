"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import dynamic from "next/dynamic";

const ExpenseChart = dynamic(() => import("@/components/charts/expense-chart"), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse bg-slate-100 rounded-xl" />,
});

export default function ExpensesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Monthly IT Expense Accrual</h1>
                <p className="text-slate-500 text-sm mt-1">Track monthly recurring IT costs across licenses and services.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {[
                    { title: "Software Licenses", value: "$4,280", trend: "+5%", color: "text-indigo-600" },
                    { title: "SIM & Mobile Plans", value: "$890", trend: "-2%", color: "text-emerald-600" },
                    { title: "Total Monthly Spend", value: "$5,170", trend: "+3.2%", color: "text-rose-600" },
                ].map((item, i) => (
                    <Card key={i} className="border-0 shadow-lg">
                        <CardContent className="py-6 px-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.title}</p>
                                    <p className={`text-3xl font-black mt-2 ${item.color}`}>{item.value}</p>
                                    <p className="text-xs font-medium text-slate-400 mt-1">{item.trend} vs last month</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <CreditCard className="h-6 w-6 text-slate-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-0 shadow-xl rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">6-Month Expense Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ExpenseChart />
                </CardContent>
            </Card>
        </div>
    );
}
