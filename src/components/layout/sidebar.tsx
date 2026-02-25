"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CreditCard,
    Home,
    MonitorSmartphone,
    Users,
    LifeBuoy,
    Database,
    ShieldCheck,
    Settings,
    Sun,
    Moon
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Systems & Assets", href: "/dashboard/assets", icon: MonitorSmartphone },
    { label: "Software Licenses", href: "/dashboard/licenses", icon: Database },
    { label: "IT Expenses", href: "/dashboard/expenses", icon: CreditCard },
    { label: "IT Tickets", href: "/dashboard/tickets", icon: LifeBuoy },
];

const adminItems = [
    { label: "User Management", href: "/dashboard/users", icon: Users },
    { label: "System Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar({ user }: { user: any }) {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    const renderLinks = (items: typeof navItems) => (
        items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                        isActive
                            ? "bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-slate-100"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                    )}
                >
                    <Icon className={cn("h-5 w-5", isActive ? "text-blue-700 dark:text-slate-100" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                    {item.label}
                </Link>
            );
        })
    );

    return (
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#0f172a] h-full sticky left-0 top-0">
            <div className="p-6 flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
                    <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">IT Assist</h1>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{user.role.replace("_", " ")}</p>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto w-full">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4 px-3">
                    Core Modules
                </div>
                {renderLinks(navItems)}

                {(user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN") && (
                    <>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-8 px-3">
                            Administration
                        </div>
                        {renderLinks(adminItems)}
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex w-full items-center gap-3 px-3 py-2.5 mb-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                    {theme === 'dark' ? (
                        <>
                            <Sun className="h-5 w-5 text-slate-400 group-hover:text-amber-500" />
                            Light Mode
                        </>
                    ) : (
                        <>
                            <Moon className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                            Dark Mode
                        </>
                    )}
                </button>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {user.name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
