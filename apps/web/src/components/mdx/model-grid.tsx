import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { resolveIcon, resolveCategoryIcon } from "@/lib/icons";

export function ModelCategory({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-16 mb-16 first:mt-0">
      <div className="mb-8">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-paper-2 text-primary [&_svg]:size-4">
            {resolveCategoryIcon(icon)}
          </span>
          Category
        </div>
        <h2 className="!mt-4 !border-0 !pt-0">{title}</h2>
        {subtitle && <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function ModelGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline md:grid-cols-2">
      {children}
    </div>
  );
}

export function ModelCard({
  title,
  icon,
  description,
  href,
  status,
}: {
  title: string;
  icon: string;
  description: string;
  href: string;
  /** "outline" marks a planned page that is not written yet. */
  status?: "outline";
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col bg-paper p-6 !no-underline transition-colors duration-300 hover:bg-accent-soft/50"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-paper-2 text-primary [&_svg]:size-4">
          {resolveIcon(icon)}
        </span>
        <span className="flex items-center gap-2">
          {status === "outline" && (
            <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Outline
            </span>
          )}
          <ArrowRight
            aria-hidden
            className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink"
          />
        </span>
      </div>
      <h3 className="!mt-5 font-display text-lg leading-snug text-ink">{title}</h3>
      <p className="!mt-2 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
    </Link>
  );
}
