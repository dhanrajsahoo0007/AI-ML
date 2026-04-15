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

export function TopicCard({
  href,
  icon,
  title,
  description,
  childCount,
  categories,
}: TopicCardProps) {
  const IconComp = icon ? getIconComponent(icon) : null;

  return (
    <div className="group relative flex flex-col rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg">
      <Link href={href} className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          {IconComp ? (
            <IconComp className="h-5 w-5 text-primary" />
          ) : (
            <span className="text-lg">{icon}</span>
          )}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-3 flex items-center text-sm font-medium text-primary">
          <span className="transition-transform group-hover:translate-x-1">
            Read guide
          </span>
          <ArrowRight className="ml-1 h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
      </Link>

      {categories && categories.length > 0 && (
        <div className="border-t border-border/40 px-5 py-3">
          {childCount != null && (
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {childCount} topics across {categories.length} categories
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <span
                key={cat}
                className="rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 text-xs"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
