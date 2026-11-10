import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getIconComponent } from "@/lib/icons";
import { ReadCount } from "@/components/read-count";

interface TopicCardProps {
  href: string;
  icon?: string;
  title: string;
  description: string;
  childCount?: number;
  categories?: string[];
  /** Position in the section's reading order, shown as "Part N". */
  step?: number;
  /** Overrides the section's tint for this card (globals.css, [data-tone]). */
  tone?: string;
  /** Page paths under this card; with them the footer shows how many the learner has read. */
  hrefs?: string[];
}

export function TopicCard({
  href,
  icon,
  title,
  description,
  childCount,
  categories,
  step,
  tone,
  hrefs,
}: TopicCardProps) {
  const IconComp = icon ? getIconComponent(icon) : null;

  return (
    <Link
      href={href}
      data-tone={tone}
      className="group flex h-full flex-col rounded-xl border border-hairline bg-paper p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-tint/60 hover:shadow-[0_18px_40px_-24px_rgba(17,17,17,0.35)] sm:p-7"
    >
      <div className="flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg bg-tint-soft text-tint">
          {IconComp ? <IconComp aria-hidden className="size-5" /> : <span className="text-lg">{icon}</span>}
        </div>
        {step != null && (
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Part {step}</span>
        )}
      </div>

      <h2 className="mt-6 font-display text-2xl leading-tight">{title}</h2>
      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted-foreground">{description}</p>

      {categories && categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <span key={cat} className="rounded-full border border-hairline px-2.5 py-0.5 text-xs text-ink-2">
              {cat}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-hairline pt-5 text-sm">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {childCount != null && categories
            ? `${childCount} topics · ${categories.length} ${categories.length === 1 ? "category" : "categories"}`
            : "Guide"}
          {hrefs && <ReadCount hrefs={hrefs} />}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          Read
          <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
