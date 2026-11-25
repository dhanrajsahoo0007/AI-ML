import { COMPANY_LOGOS } from "@/lib/company-logos";
import { cn } from "@/lib/utils";

export interface CompanyTag {
  slug: string;
  name: string;
}

// Monogram colours for companies without a logo; each provides >= 4.5:1 contrast with white text.
const MONOGRAM_COLORS = ["#1d4ed8", "#6d28d9", "#be185d", "#c2410c", "#0f766e", "#4338ca", "#15803d", "#a21caf"];

function monogram(name: string) {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

function colorFor(slug: string) {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MONOGRAM_COLORS[h % MONOGRAM_COLORS.length];
}

export function CompanyLogo({ company, className }: { company: CompanyTag; className?: string }) {
  const logo = COMPANY_LOGOS[company.slug];
  if (!logo) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[9px] leading-none font-semibold tracking-tight text-white",
          className
        )}
        style={{ backgroundColor: colorFor(company.slug) }}
      >
        {monogram(company.name)}
      </span>
    );
  }
  return (
    <svg
      aria-hidden
      viewBox={logo.viewBox}
      fill={logo.fill ?? undefined}
      fillRule="evenodd"
      className={cn("size-4 shrink-0", className)}
      dangerouslySetInnerHTML={{ __html: logo.body }}
    />
  );
}

// A small pill with the company's logo and name.
export function CompanyChip({
  company,
  active,
  count,
  onClick,
  href,
}: {
  company: CompanyTag;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  href?: string;
}) {
  const className = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] leading-none transition-colors",
    active ? "border-ink bg-ink text-paper" : "border-hairline bg-paper text-ink-2",
    (onClick || href) && !active && "hover:border-ink/40"
  );
  const body = (
    <>
      <span className={cn("inline-flex", active && "rounded-sm bg-paper p-px text-ink")}>
        <CompanyLogo company={company} className="size-3.5" />
      </span>
      {company.name}
      {count !== undefined && (
        <span data-company-count className={active ? "text-paper/80" : "text-muted-foreground"}>
          {count}
        </span>
      )}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={className}>
        {body}
      </button>
    );
  }
  if (href) {
    return (
      <a href={href} className={className}>
        {body}
      </a>
    );
  }
  return <span className={className}>{body}</span>;
}
