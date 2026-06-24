import { AppShell } from "@/components/app-shell";

export default function IspLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
