import { AppShell } from "@/components/app-shell";

export default function InventoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
