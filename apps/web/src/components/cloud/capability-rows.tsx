import { cn } from "@/lib/utils";
import { PROVIDER_BY_ID, type Capability, type ProviderId } from "@/lib/cloud-catalog";
import { FitMark, PROVIDER_TONE, ProviderTag, ServiceChip } from "./shared";

// Capability rows shared by the group table (server) and the equivalence matrix (client): one row per job, one
// column per cloud, with the lead cloud first and tinted. No hooks, so it renders on either side.

const GRID = "md:grid-cols-[1.15fr_1fr_1fr_1fr]";

export function CapabilityHeader({ order }: { order: ProviderId[] }) {
  return (
    <div className={cn("hidden gap-4 border-b border-hairline px-5 py-2.5 md:grid", GRID)}>
      <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">Capability</span>
      {order.map((p) => (
        <span
          key={p}
          className="text-xs font-semibold uppercase tracking-[0.06em]"
          style={{ color: `var(--dg-${PROVIDER_TONE[p]})` }}
        >
          {PROVIDER_BY_ID[p].name}
        </span>
      ))}
    </div>
  );
}

export function CapabilityRow({ c, order, groupLabel }: { c: Capability; order: ProviderId[]; groupLabel?: string }) {
  return (
    <div className={cn("grid gap-3 px-4 py-4 sm:px-5 md:gap-4", GRID)}>
      <div>
        {groupLabel && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {groupLabel}
          </div>
        )}
        <div className="font-display font-semibold leading-snug text-ink">{c.title}</div>
        <div className="mt-1 text-[13px] leading-snug text-muted-foreground">{c.summary}</div>
      </div>
      {order.map((p, i) => {
        const a = c[p];
        return (
          <div
            key={p}
            className={cn("rounded-lg md:rounded-none", i === 0 && "md:-my-1 md:rounded-lg md:p-1")}
            style={i === 0 ? { background: `var(--dg-${PROVIDER_TONE[p]}-soft)` } : undefined}
          >
            <div className={cn("flex flex-wrap items-center gap-1.5", i === 0 && "p-2 md:p-0")}>
              <ProviderTag id={p} className="md:hidden" />
              <FitMark fit={a.fit} />
              {a.services.map((s) => (
                <ServiceChip key={s} name={s} />
              ))}
            </div>
            {a.note && (
              <div className={cn("mt-1.5 text-[13px] leading-snug text-ink-2", i === 0 && "px-2 pb-2 md:p-0")}>
                {a.note}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
