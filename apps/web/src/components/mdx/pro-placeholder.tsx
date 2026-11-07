import Link from "next/link";
import { Lock } from "lucide-react";

// Stands in for a premium asset. Premium files are never written to public output, and the gated
// /api/assets route that will serve them to subscribers doesn't exist yet (plan §5.6 step 6, §9.2).
export function ProPlaceholder({ label, kind = "diagram" }: { label: string; kind?: "diagram" | "image" | "download" }) {
  return (
    <div
      className="my-8 flex items-center gap-3 rounded-xl border border-dashed border-hairline bg-paper-2 px-4 py-5 text-sm text-ink-2"
      data-asset-placeholder="pro"
    >
      <Lock aria-hidden className="size-4 shrink-0" />
      <span>
        <span className="font-semibold text-ink">Pro</span> {kind}: {label}.{" "}
        <Link href="/pricing" className="underline underline-offset-2">
          Available with Pro
        </Link>
      </span>
    </div>
  );
}
