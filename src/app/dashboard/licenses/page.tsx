"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Download, Database, Pencil, Trash2 } from "lucide-react";

const licenseSchema = z.object({
    softwareName: z.string().min(1, "Required"),
    category: z.string().min(1, "Required"),
    licenseType: z.string().min(1, "Required"),
    totalPurchased: z.coerce.number().min(1),
    licensesInUse: z.coerce.number().min(0),
    cost: z.coerce.number().min(0),
    vendor: z.string().min(1, "Required"),
    renewalDate: z.string().optional(),
});

type LicenseForm = z.infer<typeof licenseSchema>;

interface License {
    id: string;
    softwareName: string;
    category: string;
    licenseType: string;
    totalPurchased: number;
    licensesInUse: number;
    cost: number;
    vendor: string;
    renewalDate: string | null;
}

export default function LicensesPage() {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const form = useForm<LicenseForm>({
        resolver: zodResolver(licenseSchema),
        defaultValues: { softwareName: "", category: "", licenseType: "Subscription", totalPurchased: 1, licensesInUse: 0, cost: 0, vendor: "" },
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/licenses");
        if (res.ok) setLicenses(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onSubmit = async (data: LicenseForm) => {
        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `/api/licenses/${editingId}` : "/api/licenses";
        await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        form.reset();
        setEditingId(null);
        setDialogOpen(false);
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this license?")) return;
        await fetch(`/api/licenses/${id}`, { method: "DELETE" });
        fetchData();
    };

    const handleEdit = (l: License) => {
        setEditingId(l.id);
        form.reset({ softwareName: l.softwareName, category: l.category, licenseType: l.licenseType, totalPurchased: l.totalPurchased, licensesInUse: l.licensesInUse, cost: l.cost, vendor: l.vendor, renewalDate: l.renewalDate ? l.renewalDate.split("T")[0] : "" });
        setDialogOpen(true);
    };

    const exportCSV = () => {
        const headers = ["Software", "Category", "License Type", "Purchased", "In Use", "Cost", "Vendor", "Renewal"];
        const rows = filtered.map(l => [l.softwareName, l.category, l.licenseType, l.totalPurchased, l.licensesInUse, l.cost, l.vendor, l.renewalDate ?? ""].join(","));
        const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "licenses.csv"; a.click();
    };

    const filtered = licenses.filter(l => l.softwareName.toLowerCase().includes(search.toLowerCase()) || l.vendor.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Software Licenses</h1>
                    <p className="text-slate-500 text-sm mt-1">Track license usage and renewals.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export</Button>
                    <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); form.reset(); } }}>
                        <DialogTrigger asChild><Button className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />Add License</Button></DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle className="text-xl font-bold">{editingId ? "Edit" : "Add"} License</DialogTitle></DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {(["softwareName", "category", "licenseType", "vendor"] as const).map(field => (
                                            <FormField key={field} control={form.control} name={field} render={({ field: f }) => (
                                                <FormItem><FormLabel className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        ))}
                                        {(["totalPurchased", "licensesInUse", "cost"] as const).map(field => (
                                            <FormField key={field} control={form.control} name={field} render={({ field: f }) => (
                                                <FormItem><FormLabel className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        ))}
                                        <FormField control={form.control} name="renewalDate" render={({ field }) => (
                                            <FormItem><FormLabel>Renewal Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-11">{editingId ? "Update" : "Create"}</Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search software or vendor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
                        </div>
                        <div className="text-sm font-medium text-slate-500">{filtered.length} licenses</div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    {["Software", "Category", "Type", "Purchased", "In Use", "Available", "Cost", "Vendor", "Renewal", "Actions"].map(h => (
                                        <TableHead key={h} className="font-bold text-slate-700 text-xs uppercase tracking-wider">{h}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></TableCell>)}</TableRow>
                                )) : filtered.length === 0 ? (
                                    <TableRow><TableCell colSpan={10} className="text-center py-12 text-slate-400">
                                        <Database className="h-12 w-12 mx-auto mb-3 text-slate-300" /><p className="font-semibold">No licenses found</p>
                                    </TableCell></TableRow>
                                ) : filtered.map((l) => (
                                    <TableRow key={l.id} className="hover:bg-slate-50">
                                        <TableCell className="font-semibold text-slate-900">{l.softwareName}</TableCell>
                                        <TableCell>{l.category}</TableCell>
                                        <TableCell><span className="px-2 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">{l.licenseType}</span></TableCell>
                                        <TableCell className="font-bold">{l.totalPurchased}</TableCell>
                                        <TableCell className="font-bold text-orange-600">{l.licensesInUse}</TableCell>
                                        <TableCell className="font-bold text-emerald-600">{l.totalPurchased - l.licensesInUse}</TableCell>
                                        <TableCell className="font-semibold">${l.cost.toLocaleString()}</TableCell>
                                        <TableCell>{l.vendor}</TableCell>
                                        <TableCell className="text-xs">{l.renewalDate ? new Date(l.renewalDate).toLocaleDateString() : "—"}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(l)} className="h-8 w-8 text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)} className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
