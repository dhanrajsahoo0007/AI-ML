import { cn } from "@/lib/utils";
import type { CoverSpec } from "./catalog";
import { renderCover, type CoverVariant } from "./render";

// An issue's cover on a page: the generated SVG, inlined (no request, crisp at any size). Decorative: the title
// next to it carries the meaning. Grain only on the hero, where one cover is shown large.

export function IssueCover({
  cover,
  variant,
  id,
  className,
}: {
  cover: CoverSpec;
  variant: Extract<CoverVariant, "hero" | "card">;
  /** Unique per page (several covers share one page), e.g. the issue slug. */
  id: string;
  className?: string;
}) {
  const svg = renderCover(cover, variant, { idPrefix: `cv-${id}-${variant}`, grain: variant === "hero" });
  return (
    <div
      aria-hidden
      className={cn("overflow-hidden [&_svg]:block [&_svg]:h-full [&_svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ') }}
    />
  );
}

/** Placeholder panel for a draft without a cover yet. */
export function CoverPlaceholder({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-paper-2", className)} />;
}
