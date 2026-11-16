import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryProgressBadge, ModelCardDone } from "@/components/read-count";
import { PatternCardMatch, PatternCategoryMatchCount } from "@/components/patterns/pattern-card-match";
import { TierBadge } from "@/components/patterns/tier-badge";
import { resolveIcon, resolveCategoryIcon } from "@/lib/icons";
import { slugify } from "@/lib/doc-headings";

function collectCardHrefs(node: React.ReactNode): string[] {
  const hrefs: string[] = [];
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { href?: unknown; children?: React.ReactNode };
    if (typeof props.href === "string" && props.href.startsWith("/")) {
      hrefs.push(props.href);
    }
    if (props.children) {
      hrefs.push(...collectCardHrefs(props.children));
    }
  });
  return hrefs;
}

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
  const cardHrefs = collectCardHrefs(children);

  return (
    // The id is the target of the section index, sidebar and header-menu group links (features/docs/groups.ts).
    <div id={slugify(title)} className="mt-16 mb-16 scroll-mt-24 first:mt-0">
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-tint-soft text-tint [&_svg]:size-4">
              {resolveCategoryIcon(icon)}
            </span>
            Category
          </div>
          {cardHrefs.length > 0 && (
            <span className="flex flex-wrap items-center gap-2">
              <PatternCategoryMatchCount hrefs={cardHrefs} />
              <CategoryProgressBadge hrefs={cardHrefs} title={title} />
            </span>
          )}
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
  tier,
}: {
  title: string;
  icon: string;
  description: string;
  href: string;
  /** "outline" marks a planned page that is not written yet. */
  status?: "outline";
  /** "advanced" adds the "Advanced · Interview edge" pill (pattern hub). */
  tier?: "core" | "advanced";
}) {
  // The pattern explorer marks each card through <PatternCardMatch>: dimmed when filtered out (hover or focus to
  // peek), tinted with an inset ring when it matches. Idle on every other hub. Dimming is a muted title and a faded
  // icon at 90 % opacity, not 35 %: below about 88 % the muted text falls under WCAG AA contrast (axe).
  return (
    <Link
      href={href}
      className={[
        "group flex h-full flex-col bg-paper p-6 !no-underline transition-[background-color,opacity] duration-300 hover:bg-tint-soft/60",
        "has-[[data-pattern-match=dim]]:opacity-90 has-[[data-pattern-match=dim]]:hover:opacity-100 has-[[data-pattern-match=dim]]:focus-visible:opacity-100",
        "has-[[data-pattern-match=hit]]:bg-tint-soft/70 has-[[data-pattern-match=hit]]:shadow-[inset_0_0_0_2px_var(--tint)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-paper-2 text-tint transition-opacity group-has-[[data-pattern-match=dim]]:opacity-40 [&_svg]:size-4">
          {resolveIcon(icon)}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-2">
          <ModelCardDone href={href} title={title} />
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
      {tier === "advanced" && <TierBadge className="!mt-4 self-start" />}
      <h3
        className={`${tier === "advanced" ? "!mt-3" : "!mt-5"} font-display text-lg leading-snug text-ink group-has-[[data-pattern-match=dim]]:text-muted-foreground`}
      >
        {title}
      </h3>
      <p className="!mt-2 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      <PatternCardMatch href={href} />
    </Link>
  );
}
