import type { Metadata } from "next";

// /admin (plan §10.5, §11.1): server-rendered per request, never cached or indexed. Access is checked by each
// page (features/admin/access.ts), not here: layouts don't re-render on client navigation between pages.
// Dynamic pages get `Cache-Control: private, no-cache, no-store, …` from Next; the robots meta keeps them out
// of search engines on top of the 404 everyone but an admin gets.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: { absolute: "Admin · TokensToScale" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
