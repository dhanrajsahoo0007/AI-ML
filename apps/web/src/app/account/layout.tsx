import type { Metadata } from "next";

// Account pages are per-user, dynamic and read the database. They are not content pages, so the
// no-database-in-renders rule (AGENTS.md) doesn't apply here; they are never cached or indexed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
