"use client";

import { useSession, signOut } from "next-auth/react";
import { Menu, LogOut, Check, Building, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export default function Topbar({ user, companies }: { user: any, companies?: { id: string, name: string }[] }) {
    const { data: session, update } = useSession();
    const router = useRouter();

    const handleCompanySwitch = async (companyId: string) => {
        // Uses NextAuth update to push the change into the JWT cookie for Server Components
        await update({ companyId });
        router.refresh();
    };

    return (
        <header className="h-16 border-b border-slate-200 bg-white/70 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-500 rounded-lg">
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="font-semibold text-slate-800 text-sm md:text-base hidden sm:block tracking-tight">
                    {user.role === "SUPER_ADMIN" ? "Global Administration View" : "Corporate Portal"}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {user.role === "SUPER_ADMIN" && companies && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="hidden sm:flex border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium">
                                <Building className="mr-2 h-4 w-4 text-blue-600" />
                                God Mode: {companies.find(c => c.id === session?.user?.companyId)?.name || "All Companies"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 border-slate-200 shadow-xl rounded-xl">
                            <DropdownMenuLabel className="font-bold text-slate-900 border-b border-slate-100 pb-2">Switch Scope</DropdownMenuLabel>
                            <div className="max-h-[300px] overflow-auto py-1">
                                {companies.map((company) => (
                                    <DropdownMenuItem
                                        key={company.id}
                                        onClick={() => handleCompanySwitch(company.id)}
                                        className="font-medium px-3 py-2.5 cursor-pointer text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-blue-700 data-[highlighted]:text-blue-700"
                                    >
                                        {company.name}
                                        {session?.user?.companyId === company.id && <Check className="ml-auto h-4 w-4 text-blue-600" />}
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/login' })} className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium">
                    <LogOut className="h-4 w-4 mr-0 sm:mr-2" />
                    <span className="hidden sm:block">Log out</span>
                </Button>
            </div>
        </header>
    );
}
