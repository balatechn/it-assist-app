"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MonitorSmartphone, Database, Users, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Assets", href: "/dashboard/assets", icon: MonitorSmartphone },
    { label: "Licenses", href: "/dashboard/licenses", icon: Database },
    { label: "Tickets", href: "/dashboard/tickets", icon: LifeBuoy },
    { label: "Users", href: "/dashboard/users", icon: Users },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 lg:hidden safe-area-bottom pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-around items-center h-16">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-slate-500")} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
