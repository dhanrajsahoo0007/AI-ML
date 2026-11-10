"use client";

import Link from "next/link";
import { CompanyLogo } from "@/components/company-logo";

// The Companies panel of the header menu: each company as its logo and name, like the tiles on the companies page.
// The header loads this file on demand (next/dynamic), so the logo data stays out of every page's first load.
export function CompanyMenuItems({
  items,
  onNavigate,
}: {
  items: { title: string; href: string; slug?: string }[];
  onNavigate?: () => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl border border-hairline bg-paper p-2.5 transition-colors hover:border-tint/60 hover:bg-paper-2/60"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-background text-ink">
              <CompanyLogo company={{ slug: item.slug ?? item.title, name: item.title }} className="size-[18px]" />
            </span>
            <span className="min-w-0 truncate text-sm font-medium text-ink">{item.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
