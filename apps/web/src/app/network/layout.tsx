import { AppShell } from "@/components/app-shell";

export default function NetworkLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
