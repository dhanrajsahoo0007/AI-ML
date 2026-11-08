import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getIconComponent } from "@/lib/icons";

interface TopicCardProps {
  href: string;
  icon?: string;
  title: string;
  description: string;
  childCount?: number;
  categories?: string[];
}

export function TopicCard({ href, icon, title, description, childCount, categories }: TopicCardProps) {
  const IconComp = icon ? getIconComponent(icon) : null;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-hairline bg-paper p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-[0_18px_40px_-24px_rgba(17,17,17,0.35)] sm:p-7"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-paper-2 text-primary">
        {IconComp ? <IconComp aria-hidden className="size-5" /> : <span className="text-lg">{icon}</span>}
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
          {childCount != null && categories ? `${childCount} topics · ${categories.length} categories` : "Guide"}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          Read
          <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
