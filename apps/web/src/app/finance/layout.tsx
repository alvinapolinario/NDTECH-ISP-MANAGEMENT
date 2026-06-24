import { AppShell } from "@/components/app-shell";

export default function FinanceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
