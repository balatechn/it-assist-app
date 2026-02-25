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
import { Plus, Search, Users, Pencil, Trash2, Shield } from "lucide-react";

const userSchema = z.object({
    name: z.string().min(1, "Required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(4, "Min 4 chars").optional(),
    role: z.string().min(1, "Required"),
    companyId: z.string().min(1, "Required"),
});

type UserForm = z.infer<typeof userSchema>;

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
    company: { name: string };
}

interface Company {
    id: string;
    name: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const form = useForm<UserForm>({
        resolver: zodResolver(userSchema),
        defaultValues: { name: "", email: "", password: "", role: "VIEWER", companyId: "" },
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [uRes, cRes] = await Promise.all([fetch("/api/users"), fetch("/api/companies")]);
        if (uRes.ok) setUsers(await uRes.json());
        if (cRes.ok) setCompanies(await cRes.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onSubmit = async (data: UserForm) => {
        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `/api/users/${editingId}` : "/api/users";
        await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        form.reset();
        setEditingId(null);
        setDialogOpen(false);
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this user?")) return;
        await fetch(`/api/users/${id}`, { method: "DELETE" });
        fetchData();
    };

    const handleEdit = (u: User) => {
        setEditingId(u.id);
        form.reset({ name: u.name, email: u.email, role: u.role, companyId: u.companyId, password: "" });
        setDialogOpen(true);
    };

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.company.name.toLowerCase().includes(search.toLowerCase())
    );

    const roleColors: Record<string, string> = {
        SUPER_ADMIN: "bg-purple-100 text-purple-700",
        IT_ADMIN: "bg-blue-100 text-blue-700",
        COMPANY_ADMIN: "bg-teal-100 text-teal-700",
        HR: "bg-pink-100 text-pink-700",
        VIEWER: "bg-slate-100 text-slate-600",
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage users, roles, and company assignments.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); form.reset(); } }}>
                    <DialogTrigger asChild><Button className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4 mr-2" />Add User</Button></DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle className="text-xl font-bold">{editingId ? "Edit" : "Add"} User</DialogTitle></DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    {!editingId && (
                                        <FormField control={form.control} name="password" render={({ field }) => (
                                            <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    )}
                                    <FormField control={form.control} name="role" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>{["SUPER_ADMIN", "IT_ADMIN", "COMPANY_ADMIN", "HR", "VIEWER"].map(r => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="companyId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Company</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger></FormControl>
                                                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 h-11">{editingId ? "Update" : "Create"} User</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search by name, email, company..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
                        </div>
                        <div className="text-sm font-medium text-slate-500">{filtered.length} users</div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    {["Name", "Email", "Company", "Role", "Actions"].map(h => (
                                        <TableHead key={h} className="font-bold text-slate-700 text-xs uppercase tracking-wider">{h}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></TableCell>)}</TableRow>
                                )) : filtered.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                        <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" /><p className="font-semibold">No users found</p>
                                    </TableCell></TableRow>
                                ) : filtered.map((u) => (
                                    <TableRow key={u.id} className="hover:bg-slate-50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">{u.name.charAt(0)}</div>
                                                <span className="font-semibold text-slate-900">{u.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600">{u.email}</TableCell>
                                        <TableCell className="font-medium">{u.company.name}</TableCell>
                                        <TableCell>
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1 ${roleColors[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                                                {u.role === "SUPER_ADMIN" && <Shield className="h-3 w-3" />}
                                                {u.role.replace("_", " ")}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} className="h-8 w-8 text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
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
