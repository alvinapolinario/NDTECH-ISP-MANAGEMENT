import { AppSidebar } from "@/components/app-sidebar";
import { AppTopNav } from "@/components/app-top-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9] text-slate-950 md:flex-row">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopNav />
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
