import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// The "Advanced · Interview edge" pill on pattern hub cards and in the article header of a page with
// `tier: advanced`. Tint is never text (globals.css): ink text on a tint-soft pill, the icon in tint.
export function TierBadge({ className }: { className?: string }) {
  return (
    <span
      title="Advanced pattern: naming it in a senior interview sets your design apart"
      data-testid="tier-badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-tint/50 bg-tint-soft px-2 py-0.5 text-[11px] font-medium text-ink",
        className
      )}
    >
      <Zap aria-hidden className="size-3 text-tint" />
      Advanced · Interview edge
    </span>
  );
}
