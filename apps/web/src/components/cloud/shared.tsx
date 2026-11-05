import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  FIT_LABEL,
  PROVIDER_BY_ID,
  SERVICE_BY_ID,
  type Fit,
  type ProviderId,
} from "@/lib/cloud-catalog";
import type { Tone } from "@/components/diagrams/types";

// Shared bits for the cloud widgets: provider colours, fit marks and service chips.

// One tone per cloud so a provider keeps its colour across every widget.
export const PROVIDER_TONE: Record<ProviderId, Tone> = { aws: "orange", gcp: "green", azure: "blue" };

export const FIT_TONE: Record<Fit, Tone> = { direct: "green", close: "teal", partial: "orange", none: "neutral" };

export const PROVIDER_ORDER: ProviderId[] = ["aws", "gcp", "azure"];

/** The lead provider first, the other two in the usual order. */
export function providerOrder(lead: ProviderId): ProviderId[] {
  return [lead, ...PROVIDER_ORDER.filter((p) => p !== lead)];
}

export function ProviderTag({ id, className }: { id: ProviderId; className?: string }) {
  const tone = PROVIDER_TONE[id];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.04em]",
        className,
      )}
      style={{ background: `var(--dg-${tone}-soft)`, color: `var(--dg-${tone})` }}
    >
      {PROVIDER_BY_ID[id].short}
    </span>
  );
}

export function FitMark({ fit, className }: { fit: Fit; className?: string }) {
  const tone = `var(--dg-${FIT_TONE[fit]})`;
  return (
    <span
      className={cn("inline-block size-3 shrink-0 rounded-full border-2", className)}
      style={{
        borderColor: tone,
        background:
          fit === "direct"
            ? tone
            : fit === "close"
              ? `conic-gradient(${tone} 0 75%, transparent 75% 100%)`
              : fit === "partial"
                ? `linear-gradient(90deg, ${tone} 50%, transparent 50%)`
                : "transparent",
        opacity: fit === "none" ? 0.55 : 1,
      }}
      aria-label={FIT_LABEL[fit]}
      title={FIT_LABEL[fit]}
      role="img"
    />
  );
}

export function FitLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(FIT_LABEL) as Fit[]).map((f) => (
        <span key={f} className="inline-flex items-center gap-1.5">
          <FitMark fit={f} />
          {FIT_LABEL[f]}
        </span>
      ))}
    </div>
  );
}

/** Where a service's profile card lives: its provider's page for the service's group. */
export function serviceHref(id: string) {
  const s = SERVICE_BY_ID[id];
  return s ? `/cloud/${s.provider}/${s.group}#${s.id}` : undefined;
}

/** A service id from the catalog (linked to its profile) or a plain name. */
export function ServiceChip({ name, className }: { name: string; className?: string }) {
  const s = SERVICE_BY_ID[name];
  const base = cn(
    "inline-flex items-center rounded-full border border-hairline bg-paper px-2.5 py-0.5 text-[13px] leading-snug text-ink",
    className,
  );
  if (!s) return <span className={base}>{name}</span>;
  return (
    <Link href={serviceHref(name)!} className={cn(base, "no-underline! hover:border-ink")} title={s.name}>
      {s.short}
    </Link>
  );
}
