import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import BottomNav from "@/components/layout/bottom-nav";
import prisma from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    let companies: { id: string, name: string }[] = [];
    if (session.user.role === "SUPER_ADMIN") {
        // Only fetch for God Mode
        companies = await prisma.company.findMany({
            select: { id: true, name: true }
        });
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground overflow-hidden w-full relative">
            <Sidebar user={session.user} />
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Topbar user={session.user} companies={companies} />
                <main className="flex-1 overflow-y-auto w-full p-4 md:p-6 pb-24 lg:pb-6">
                    {children}
                </main>
            </div>
            <BottomNav />
        </div>
    );
}
