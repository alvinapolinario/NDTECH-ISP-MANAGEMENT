import { AppShell } from "@/components/app-shell";

export default function ProjectsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
