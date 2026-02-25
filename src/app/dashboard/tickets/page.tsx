"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, LifeBuoy, Pencil, Trash2 } from "lucide-react";

const ticketSchema = z.object({
    title: z.string().min(1, "Required"),
    employee: z.string().min(1, "Required"),
    department: z.string().min(1, "Required"),
    status: z.string().min(1, "Required"),
});

type TicketForm = z.infer<typeof ticketSchema>;

interface Ticket {
    id: string;
    title: string | null;
    employee: string;
    department: string;
    status: string;
    createdAt: string;
}

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const form = useForm<TicketForm>({
        resolver: zodResolver(ticketSchema),
        defaultValues: { title: "", employee: "", department: "", status: "Open" },
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/tickets");
        if (res.ok) setTickets(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onSubmit = async (data: TicketForm) => {
        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `/api/tickets/${editingId}` : "/api/tickets";
        await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        form.reset();
        setEditingId(null);
        setDialogOpen(false);
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this ticket?")) return;
        await fetch(`/api/tickets/${id}`, { method: "DELETE" });
        fetchData();
    };

    const handleEdit = (t: Ticket) => {
        setEditingId(t.id);
        form.reset({ title: t.title ?? "", employee: t.employee, department: t.department, status: t.status });
        setDialogOpen(true);
    };

    const filtered = tickets.filter(t =>
        (t.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
        t.employee.toLowerCase().includes(search.toLowerCase()) ||
        t.department.toLowerCase().includes(search.toLowerCase())
    );

    const statusColors: Record<string, string> = {
        Open: "bg-red-100 text-red-700",
        "In Progress": "bg-yellow-100 text-yellow-700",
        Resolved: "bg-emerald-100 text-emerald-700",
        Closed: "bg-slate-100 text-slate-600",
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">IT Tickets</h1>
                    <p className="text-slate-500 text-sm mt-1">Track and manage IT requests across departments.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); form.reset(); } }}>
                    <DialogTrigger asChild><Button className="bg-orange-600 hover:bg-orange-700"><Plus className="h-4 w-4 mr-2" />New Ticket</Button></DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle className="text-xl font-bold">{editingId ? "Edit" : "Create"} Ticket</DialogTitle></DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                                <FormField control={form.control} name="title" render={({ field }) => (
                                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Brief description of the issue..." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="employee" render={({ field }) => (
                                        <FormItem><FormLabel>Reported By</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="department" render={({ field }) => (
                                        <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="status" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {["Open", "In Progress", "Resolved", "Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 h-11">{editingId ? "Update" : "Create"} Ticket</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["Open", "In Progress", "Resolved", "Closed"].map(status => {
                    const count = tickets.filter(t => t.status === status).length;
                    return (
                        <Card key={status} className="border-0 shadow-md">
                            <CardContent className="py-4 px-5 flex items-center justify-between">
                                <div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{status}</p><p className="text-3xl font-black text-slate-900 mt-1">{count}</p></div>
                                <div className={`w-3 h-3 rounded-full ${status === "Open" ? "bg-red-500" : status === "In Progress" ? "bg-yellow-500" : status === "Resolved" ? "bg-emerald-500" : "bg-slate-400"}`} />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    {["Title", "Reported By", "Department", "Status", "Created", "Actions"].map(h => (
                                        <TableHead key={h} className="font-bold text-slate-700 text-xs uppercase tracking-wider">{h}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></TableCell>)}</TableRow>
                                )) : filtered.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400">
                                        <LifeBuoy className="h-12 w-12 mx-auto mb-3 text-slate-300" /><p className="font-semibold">No tickets found</p>
                                    </TableCell></TableRow>
                                ) : filtered.map((t) => (
                                    <TableRow key={t.id} className="hover:bg-slate-50">
                                        <TableCell className="font-semibold text-slate-900">{t.title || "Untitled"}</TableCell>
                                        <TableCell>{t.employee}</TableCell>
                                        <TableCell>{t.department}</TableCell>
                                        <TableCell><span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusColors[t.status] ?? "bg-slate-100 text-slate-600"}`}>{t.status}</span></TableCell>
                                        <TableCell className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(t)} className="h-8 w-8 text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
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
