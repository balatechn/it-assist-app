"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Plus, CalendarIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import dynamic from "next/dynamic";

const ExpenseChart = dynamic(() => import("@/components/charts/expense-chart"), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />,
});

const accrualSchema = z.object({
    title: z.string().min(1, "Required"),
    category: z.string().min(1, "Required"),
    amount: z.any().transform(v => Number(v)),
    date: z.string().min(1, "Required"),
});

type AccrualForm = z.infer<typeof accrualSchema>;

interface ExpenseAccrual {
    id: string;
    title: string;
    category: string;
    amount: number;
    date: string;
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<ExpenseAccrual[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    const form = useForm<AccrualForm>({
        resolver: zodResolver(accrualSchema),
        defaultValues: { title: "", category: "Software", amount: undefined, date: new Date().toISOString().split('T')[0] },
    });

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/expenses");
        if (res.ok) setExpenses(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    const onSubmit = async (data: AccrualForm) => {
        await fetch("/api/expenses", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        setDialogOpen(false);
        form.reset();
        fetchExpenses();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        setExpenses(prev => prev.filter(e => e.id !== id)); // optimistically remove
        await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    };

    const totalSpend = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Monthly IT Expense Accrual</h1>
                    <p className="text-slate-500 text-sm mt-1">Track monthly recurring IT costs across licenses and services.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />Add Accrual
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add Monthly Accrual</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                                <FormField control={form.control} name="title" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Expense Title</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. AWS Hosting" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="category" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Software">Software License</SelectItem>
                                                <SelectItem value="Hardware">Hardware Lease</SelectItem>
                                                <SelectItem value="Network">Network/ISP</SelectItem>
                                                <SelectItem value="Services">Cloud Services</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount ($)</FormLabel>
                                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Billing Date</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Save Accrual</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-0 shadow-lg dark:bg-slate-900 border dark:border-slate-800">
                    <CardContent className="py-6 px-6 relative overflow-hidden">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 mt-1">Total Monthly Spend</p>
                        <p className="text-4xl font-black text-rose-600">${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <CreditCard className="h-20 w-20 text-rose-100 absolute -right-4 -bottom-4 opacity-50 rotate-12" />
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-lg md:col-span-2 dark:bg-slate-900 border dark:border-slate-800">
                    <CardHeader className="pb-0 pt-4 px-6">
                        <CardTitle className="text-sm text-slate-500 font-semibold uppercase tracking-wider">6-Month Trend Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[120px]">
                        <ExpenseChart />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-xl rounded-2xl dark:bg-slate-900 border dark:border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Accrual Records</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                                ) : expenses.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">No accruals tracked yet.</TableCell></TableRow>
                                ) : (
                                    expenses.map(e => (
                                        <TableRow key={e.id}>
                                            <TableCell className="font-semibold">{e.title}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs rounded-full font-medium">{e.category}</span>
                                            </TableCell>
                                            <TableCell>{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                                            <TableCell className="text-right font-medium text-rose-600">${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
