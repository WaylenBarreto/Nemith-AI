import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nemith — Workspace",
  description: "AI-powered development agent workspace",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
