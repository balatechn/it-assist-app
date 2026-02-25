"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Download, MonitorSmartphone, Pencil, Trash2, QrCode } from "lucide-react";
import { QRScanner } from "@/components/ui/qr-scanner";

const assetSchema = z.object({
    department: z.string().min(1, "Required"),
    location: z.string().min(1, "Required"),
    product: z.string().min(1, "Required"),
    serialNo: z.string().min(1, "Required"),
    make: z.string().min(1, "Required"),
    osVersion: z.string().min(1, "Required"),
    config: z.string().min(1, "Required"),
    status: z.string().min(1, "Required"),
    cost: z.any().transform(v => v ? Number(v) : undefined),
});

type AssetForm = z.infer<typeof assetSchema>;

interface Asset {
    id: string;
    department: string;
    location: string;
    product: string;
    serialNo: string;
    make: string;
    osVersion: string;
    config: string;
    status: string;
    cost: number | null;
    createdAt: string;
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [scannerOpen, setScannerOpen] = useState(false);

    const form = useForm<AssetForm>({
        resolver: zodResolver(assetSchema),
        defaultValues: { department: "", location: "", product: "", serialNo: "", make: "", osVersion: "", config: "", status: "Active" },
    });

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/assets");
        if (res.ok) setAssets(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchAssets(); }, [fetchAssets]);

    const onSubmit = async (data: AssetForm) => {
        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `/api/assets/${editingId}` : "/api/assets";
        await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        form.reset();
        setEditingId(null);
        setScannerOpen(false);
        setDialogOpen(false);
        fetchAssets();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this asset?")) return;
        await fetch(`/api/assets/${id}`, { method: "DELETE" });
        fetchAssets();
    };

    const handleEdit = (asset: Asset) => {
        setEditingId(asset.id);
        form.reset({ department: asset.department, location: asset.location, product: asset.product, serialNo: asset.serialNo, make: asset.make, osVersion: asset.osVersion, config: asset.config, status: asset.status, cost: asset.cost ?? undefined });
        setDialogOpen(true);
    };

    const exportCSV = () => {
        const headers = ["Department", "Location", "Product", "Serial No", "Make", "OS", "Config", "Status", "Cost"];
        const rows = filtered.map(a => [a.department, a.location, a.product, a.serialNo, a.make, a.osVersion, a.config, a.status, a.cost ?? ""].join(","));
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "assets.csv"; a.click();
    };

    const filtered = assets.filter(a =>
        a.product.toLowerCase().includes(search.toLowerCase()) ||
        a.serialNo.toLowerCase().includes(search.toLowerCase()) ||
        a.department.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Systems & Assets</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage all hardware inventory across the organization.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportCSV} className="border-slate-200">
                        <Download className="h-4 w-4 mr-2" />Export
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); form.reset(); setScannerOpen(false); } }}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Asset</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">{editingId ? "Edit" : "Add New"} Asset</DialogTitle>
                            </DialogHeader>
                            {scannerOpen ? (
                                <QRScanner
                                    onScan={(text) => {
                                        form.setValue("serialNo", text);
                                        setScannerOpen(false);
                                    }}
                                    onClose={() => setScannerOpen(false)}
                                />
                            ) : (
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="serialNo" render={({ field: f }) => (
                                                <FormItem className="col-span-2 sm:col-span-1">
                                                    <FormLabel>Serial No</FormLabel>
                                                    <div className="flex gap-2">
                                                        <FormControl><Input {...f} /></FormControl>
                                                        <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)}>
                                                            <QrCode className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />

                                            {(["department", "location", "product", "make", "osVersion", "config"] as const).map((field) => (
                                                <FormField key={field} control={form.control} name={field} render={({ field: f }) => (
                                                    <FormItem>
                                                        <FormLabel className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</FormLabel>
                                                        <FormControl><Input {...f} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            ))}
                                            <FormField control={form.control} name="status" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Status</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {["Active", "In Repair", "Decommissioned", "In Stock"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="cost" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Cost ($)</FormLabel>
                                                    <FormControl><Input type="number" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11">{editingId ? "Update" : "Create"} Asset</Button>
                                    </form>
                                </Form>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search by product, serial, department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
                        </div>
                        <div className="text-sm font-medium text-slate-500">{filtered.length} assets</div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    {["Product", "Serial No", "Department", "Location", "Make", "OS", "Status", "Cost", "Actions"].map(h => (
                                        <TableHead key={h} className="font-bold text-slate-700 text-xs uppercase tracking-wider">{h}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></TableCell>)}</TableRow>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <TableRow><TableCell colSpan={9} className="text-center py-12 text-slate-400">
                                        <MonitorSmartphone className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                        <p className="font-semibold">No assets found</p>
                                    </TableCell></TableRow>
                                ) : (
                                    filtered.map((a) => (
                                        <TableRow key={a.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-semibold text-slate-900">{a.product}</TableCell>
                                            <TableCell className="font-mono text-xs text-slate-600">{a.serialNo}</TableCell>
                                            <TableCell>{a.department}</TableCell>
                                            <TableCell>{a.location}</TableCell>
                                            <TableCell>{a.make}</TableCell>
                                            <TableCell className="text-xs">{a.osVersion}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${a.status === "Active" ? "bg-emerald-100 text-emerald-700" : a.status === "In Repair" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                                                    {a.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-semibold">{a.cost ? `$${a.cost.toLocaleString()}` : "—"}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(a)} className="h-8 w-8 text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
