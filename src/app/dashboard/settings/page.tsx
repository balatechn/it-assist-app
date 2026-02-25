"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Mail } from "lucide-react";

const smtpSchema = z.object({
    smtpProvider: z.string().min(1, "Required"),
    smtpHost: z.string().min(1, "Required"),
    smtpPort: z.string().min(1, "Required"),
    smtpUser: z.string().email("Must be a valid email"),
    smtpPassword: z.string().min(1, "Required"),
});

type SMTPFormValues = z.infer<typeof smtpSchema>;

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const form = useForm<SMTPFormValues>({
        resolver: zodResolver(smtpSchema),
        defaultValues: {
            smtpProvider: "google",
            smtpHost: "smtp.gmail.com",
            smtpPort: "587",
            smtpUser: "",
            smtpPassword: "",
        },
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                const settingsMap = data.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});

                if (settingsMap.smtpProvider) {
                    form.reset({
                        smtpProvider: settingsMap.smtpProvider,
                        smtpHost: settingsMap.smtpHost || "",
                        smtpPort: settingsMap.smtpPort || "",
                        smtpUser: settingsMap.smtpUser || "",
                        smtpPassword: settingsMap.smtpPassword || "",
                    });
                }
            }
            setLoading(false);
        };
        fetchSettings();
    }, [form]);

    const handleProviderChange = (provider: string) => {
        form.setValue("smtpProvider", provider);
        if (provider === "google") {
            form.setValue("smtpHost", "smtp.gmail.com");
            form.setValue("smtpPort", "587");
        } else if (provider === "microsoft") {
            form.setValue("smtpHost", "smtp.office365.com");
            form.setValue("smtpPort", "587");
        } else {
            form.setValue("smtpHost", "");
            form.setValue("smtpPort", "");
        }
    };

    const onSubmit = async (data: SMTPFormValues) => {
        setSaving(true);
        await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        setSaving(false);
        alert("SMTP Configuration saved successfully!");
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings</h1>
                <p className="text-slate-500 text-sm mt-1">Configure global application preferences.</p>
            </div>

            <Card className="border-0 shadow-lg dark:bg-slate-900 border dark:border-slate-800">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-xl">Email Configuration (SMTP)</CardTitle>
                    </div>
                    <CardDescription>Configure outgoing mail server for system alerts and notifications.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                        </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="smtpProvider"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Provider</FormLabel>
                                            <Select
                                                onValueChange={(val) => {
                                                    field.onChange(val);
                                                    handleProviderChange(val);
                                                }}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                                                        <SelectValue placeholder="Select provider" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="google">Google Workspace (Gmail)</SelectItem>
                                                    <SelectItem value="microsoft">Microsoft 365 (Outlook)</SelectItem>
                                                    <SelectItem value="custom">Custom SMTP</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="smtpHost"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>SMTP Server Host</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="dark:bg-slate-800 dark:border-slate-700" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="smtpPort"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>SMTP Port</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="dark:bg-slate-800 dark:border-slate-700" />
                                                </FormControl>
                                                <FormDescription>Usually 587 or 465</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="smtpUser"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>SMTP Username / Email</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="email" className="dark:bg-slate-800 dark:border-slate-700" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="smtpPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>SMTP Password / App Password</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="password" placeholder="••••••••" className="dark:bg-slate-800 dark:border-slate-700" />
                                                </FormControl>
                                                <FormDescription>For Google/Microsoft, use an App Password.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                                        <Save className="h-4 w-4 mr-2" />
                                        {saving ? "Saving..." : "Save Configuration"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
