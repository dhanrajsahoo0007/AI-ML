"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CAPABILITIES,
  GROUPS,
  GROUP_BY_ID,
  PROVIDERS,
  SERVICE_BY_ID,
  VERIFIED,
  type GroupId,
  type ProviderId,
} from "@/lib/cloud-catalog";
import { CapabilityHeader, CapabilityRow } from "./capability-rows";
import { FitLegend, PROVIDER_TONE, providerOrder } from "./shared";

// Every capability across all service groups: search by job or service name, filter by group, and choose which cloud
// to list first. Usage in MDX: <CloudEquivalenceMatrix />
export function CloudEquivalenceMatrix() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupId | "all">("all");
  const [lead, setLead] = useState<ProviderId>("aws");
  const order = providerOrder(lead);

  // Search text per capability: its title, summary and every service name on each cloud.
  const haystack = useMemo(
    () =>
      new Map(
        CAPABILITIES.map((c) => {
          const names = (["aws", "gcp", "azure"] as ProviderId[]).flatMap((p) =>
            c[p].services.map((s) => (SERVICE_BY_ID[s] ? `${SERVICE_BY_ID[s].name} ${SERVICE_BY_ID[s].short}` : s))
          );
          return [c.id, `${c.title} ${c.summary} ${names.join(" ")}`.toLowerCase()];
        })
      ),
    []
  );

  const q = query.trim().toLowerCase();
  const rows = CAPABILITIES.filter(
    (c) => (group === "all" || c.group === group) && (!q || haystack.get(c.id)!.includes(q))
  );
  // Groups that have capability rows, so filter chips never lead to an empty list.
  const groupsWithRows = GROUPS.filter((g) => CAPABILITIES.some((c) => c.group === g.id));

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="space-y-3 border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-56">
            <span className="sr-only">Search capabilities and services</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a job or a service, e.g. queue, Fargate, Spanner"
              className="w-full rounded-full border border-hairline bg-paper py-1.5 pr-3 pl-9 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-ink"
            />
          </label>
          <div
            className="flex items-center gap-1 rounded-full border border-hairline bg-paper p-0.5"
            role="group"
            aria-label="List first"
          >
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={lead === p.id}
                onClick={() => setLead(p.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  lead === p.id ? "text-paper" : "text-muted-foreground hover:text-ink"
                )}
                style={lead === p.id ? { background: `var(--dg-${PROVIDER_TONE[p.id]})` } : undefined}
              >
                {p.short} first
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Service group">
          {[{ id: "all" as const, title: "All groups" }, ...groupsWithRows].map((g) => {
            const on = group === g.id;
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => setGroup(g.id)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                  on ? "border-ink bg-ink text-paper" : "border-hairline bg-paper text-ink-2 hover:border-ink/40"
                )}
              >
                {g.title}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {rows.length} of {CAPABILITIES.length} capabilities
          </span>
          <FitLegend />
        </div>
      </div>

      <CapabilityHeader order={order} />
      <div className="divide-y divide-hairline" aria-live="polite">
        {rows.map((c) => (
          <CapabilityRow
            key={c.id}
            c={c}
            order={order}
            groupLabel={group === "all" ? GROUP_BY_ID[c.group].title : undefined}
          />
        ))}
        {rows.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No capability matches “{query}”.</p>
        )}
      </div>
      <div className="border-t border-hairline px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
        Checked against provider documentation in {VERIFIED}. Click a service for its profile.
      </div>
    </div>
  );
}
