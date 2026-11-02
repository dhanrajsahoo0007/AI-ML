import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/types/content";

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <div className={cn(
        "text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i}>
            {i > 0 && <span className="mx-2 text-ink/25">/</span>}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-ink">{item.label}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
