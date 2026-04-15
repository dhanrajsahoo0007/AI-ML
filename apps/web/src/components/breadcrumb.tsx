import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/types/content";

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i}>
            {i > 0 && <span className="mx-2">/</span>}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="capitalize transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span className="capitalize">{item.label}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
