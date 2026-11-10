import { cn } from "@/lib/utils";

/**
 * The TokensToScale mark: one token fanning out to two nodes, then four. The branches take the text colour, so
 * the mark follows light and dark themes; the root token is the brand orange. Source files: assets/brand/.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("shrink-0", className)}>
      <path
        d="M10 32L30 18M10 32L30 46M30 18L54 9M30 18L54 25M30 46L54 39M30 46L54 55"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="10" cy="32" r="6.5" className="fill-[#e8590c] dark:fill-[#ff7a2f]" />
      <g fill="currentColor">
        <circle cx="30" cy="18" r="5.5" />
        <circle cx="30" cy="46" r="5.5" />
        <circle cx="54" cy="9" r="5" />
        <circle cx="54" cy="25" r="5" />
        <circle cx="54" cy="39" r="5" />
        <circle cx="54" cy="55" r="5" />
      </g>
    </svg>
  );
}
