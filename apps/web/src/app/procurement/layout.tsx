import { AppShell } from "@/components/app-shell";

export default function ProcurementLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
