import { GROUP_BY_ID, VERIFIED, capabilitiesFor, type GroupId, type ProviderId } from "@/lib/cloud-catalog";
import { CapabilityHeader, CapabilityRow } from "./capability-rows";
import { FitLegend, providerOrder } from "./shared";

// Equivalence table for one service group: one row per capability, one column per cloud, lead cloud first.
// Usage in MDX: <CloudGroupTable group="containers" lead="gcp" />
export function CloudGroupTable({ group, lead = "aws" }: { group: GroupId; lead?: ProviderId }) {
  if (!GROUP_BY_ID[group]) return <p className="text-sm text-muted-foreground">Unknown service group: {group}</p>;
  const rows = capabilitiesFor(group);
  const order = providerOrder(lead);

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {GROUP_BY_ID[group].title}: the same job on each cloud
        </span>
        <FitLegend />
      </div>
      <CapabilityHeader order={order} />
      <div className="divide-y divide-hairline">
        {rows.map((c) => (
          <CapabilityRow key={c.id} c={c} order={order} />
        ))}
      </div>
      <div className="border-t border-hairline px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
        Checked against provider documentation in {VERIFIED}. Click a service for its profile.
      </div>
    </div>
  );
}
