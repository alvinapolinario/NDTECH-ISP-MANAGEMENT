import { AppShell } from "@/components/app-shell";

export default function BillingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
