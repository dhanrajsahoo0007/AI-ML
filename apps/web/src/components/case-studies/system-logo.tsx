import { findAsset, inlineSvg } from "@/lib/assets";
import { cn } from "@/lib/utils";

// The logo of the system a case study discusses (plan §6.1), inlined from the asset manifest on a white rounded
// tile with a hairline border, so a black or dark brand mark still reads in dark mode. Server component only: the
// SVG is read from disk, so no logo ships in client JavaScript.
//
//   <SystemLogo id="systems/messenger" />     assets/logos/systems/messenger.svg
//   <SystemLogo id="companies/openai" />      a company logo reused for a product page
//   <SystemLogo id="tech/oss/apache-kafka" /> a technology mark ("Modelled on")
//
// An id with no asset falls back to a monogram tile, so a missing brand never breaks a page.

const SIZES = { sm: "size-7 rounded-md p-1", md: "size-9 rounded-lg p-1.5", lg: "size-12 rounded-xl p-2" } as const;

function monogram(id: string) {
  const name = id.split("/").pop() ?? id;
  const words = name.split("-").filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

export function SystemLogo({
  id,
  size = "md",
  title,
  className,
}: {
  id: string;
  size?: keyof typeof SIZES;
  /** Accessible name; omit when a visible title sits next to the logo (the tile is then decorative). */
  title?: string;
  className?: string;
}) {
  const asset = findAsset(`logos/${id}`);
  let svg: string | null = null;
  if (asset) {
    try {
      svg = inlineSvg(asset);
    } catch {
      svg = null;
    }
  }
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
  return (
    <span
      {...a11y}
      data-system-logo={id}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-black/10 bg-white text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:border-white/15 [&_svg]:size-full",
        SIZES[size],
        className
      )}
      {...(svg
        ? { dangerouslySetInnerHTML: { __html: svg } }
        : { children: <span className="text-[11px] leading-none font-semibold tracking-tight">{monogram(id)}</span> })}
    />
  );
}
