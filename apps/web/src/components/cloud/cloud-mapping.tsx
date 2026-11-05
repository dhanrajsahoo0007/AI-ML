import Link from "next/link";
import { SERVICE_BY_ID, PROVIDER_BY_ID, type ProviderId } from "@/lib/cloud-catalog";
import { DIAGRAMS } from "@/components/diagrams/specs";
import type { CloudRef } from "@/components/diagrams/types";
import { PROVIDER_ORDER, PROVIDER_TONE, ProviderTag, serviceHref } from "./shared";

// Component → service table for a case-study diagram: one row per node that has `cloud` refs, one column per
// cloud, so the diagram toggle and this table can never disagree. Usage in MDX:
// <CloudMapping diagram="messenger/architecture" lead="aws" />
export function CloudMapping({ diagram, lead = "aws" }: { diagram: string; lead?: ProviderId }) {
  const spec = DIAGRAMS[diagram];
  if (!spec) return <p className="text-sm text-muted-foreground">Unknown diagram: {diagram}</p>;
  const rows = spec.nodes.filter((n) => n.cloud);
  const order = [lead, ...PROVIDER_ORDER.filter((p) => p !== lead)];

  return (
    <div className="my-8 overflow-x-auto rounded-xl border border-hairline bg-paper">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-hairline bg-paper-2/60">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Component
            </th>
            {order.map((p) => (
              <th
                key={p}
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em]"
                style={{ color: `var(--dg-${PROVIDER_TONE[p]})` }}
              >
                {PROVIDER_BY_ID[p].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((n) => (
            <tr key={n.id}>
              <td className="px-4 py-2.5 align-top">
                <div className="font-semibold text-ink">{n.label}</div>
                {n.sub && <div className="text-[13px] text-muted-foreground">{n.sub}</div>}
              </td>
              {order.map((p, i) => (
                <td
                  key={p}
                  className="px-4 py-2.5 align-top"
                  style={i === 0 ? { background: `var(--dg-${PROVIDER_TONE[p]}-soft)` } : undefined}
                >
                  <ProviderTag id={p} className="mr-1.5 md:hidden" />
                  <RefCell ref_={n.cloud?.[p]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RefCell({ ref_ }: { ref_?: CloudRef }) {
  if (!ref_) return <span className="text-muted-foreground">—</span>;
  const id = typeof ref_ === "string" ? ref_ : ref_.id;
  const s = id ? SERVICE_BY_ID[id] : undefined;
  const label = typeof ref_ === "string" ? s?.short ?? ref_ : ref_.label;
  if (!s) return <span className="text-ink-2">{label}</span>;
  return (
    <Link href={serviceHref(s.id)!} title={s.name} className="font-medium text-ink no-underline! hover:underline!">
      {label}
    </Link>
  );
}
