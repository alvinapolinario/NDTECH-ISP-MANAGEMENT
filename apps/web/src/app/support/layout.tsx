import { AppShell } from "@/components/app-shell";

export default function SupportLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
