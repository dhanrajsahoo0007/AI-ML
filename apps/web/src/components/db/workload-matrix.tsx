"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAMILIES, FAMILY_BY_ID, SCENARIOS, type FamilyId, type ScenarioId } from "@/lib/db-catalog";
import { FIT_LABEL, FIT_TONE, FamilyIcon, FitLegend, FitMark } from "./shared";

// Database families vs workloads. Picking workload chips ranks the families by how well they fit all of the
// picked workloads and dims the rest; clicking a cell explains that rating.
export function DatabaseWorkloadMatrix({ compact = false }: { compact?: boolean }) {
  // compact: the hub teaser, with a link through to the full guide.
  const [picked, setPicked] = useState<ScenarioId[]>([]);
  const [cell, setCell] = useState<{ family: FamilyId; scenario: ScenarioId } | null>(null);

  const toggle = (id: ScenarioId) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Score = sum of fits over the picked workloads; a family is "best" when no other family scores higher.
  const ranked = useMemo(() => {
    if (picked.length === 0) return FAMILIES.map((f) => ({ f, score: 0 }));
    return FAMILIES.map((f) => ({ f, score: picked.reduce((s, id) => s + f.fit[id][0], 0) })).sort(
      (a, b) => b.score - a.score,
    );
  }, [picked]);
  const top = ranked[0]?.score ?? 0;
  const max = picked.length * 2;

  const detail = cell ? { fam: FAMILY_BY_ID[cell.family], sc: SCENARIOS.find((s) => s.id === cell.scenario)! } : null;
  const detailFit = detail ? detail.fam.fit[detail.sc.id] : null;

  return (
    <div className="my-8 rounded-xl border border-hairline bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Which database fits my workload?
        </div>
        <FitLegend />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick one or more workloads. The best-fitting families rise to the top. Click any dot to see why.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Workloads">
        {SCENARIOS.map((s) => {
          const on = picked.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-[13px] transition-colors",
                on ? "border-ink bg-ink text-paper" : "border-hairline bg-paper text-ink-2 hover:border-ink/40",
              )}
            >
              {s.label}
            </button>
          );
        })}
        {picked.length > 0 && (
          <button
            type="button"
            onClick={() => setPicked([])}
            className="px-2 py-1 text-[13px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="table" aria-label="Database families by workload fit" className="min-w-[640px] text-sm">
          <div role="row" className="grid grid-cols-[minmax(130px,1.2fr)_repeat(10,minmax(42px,1fr))] border-b border-ink pb-2">
            <span role="columnheader" className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Family
            </span>
            {SCENARIOS.map((s) => (
              <span
                role="columnheader"
                key={s.id}
                title={s.label}
                className={cn(
                  "text-center text-[11px] font-semibold uppercase tracking-[0.04em]",
                  picked.includes(s.id) ? "text-ink" : "text-muted-foreground",
                )}
              >
                {s.short}
              </span>
            ))}
          </div>

          {ranked.map(({ f, score }) => {
            const best = picked.length > 0 && score === top;
            const dim = picked.length > 0 && !best && score < top - 1;
            return (
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                role="row"
                key={f.id}
                className={cn(
                  "grid grid-cols-[minmax(130px,1.2fr)_repeat(10,minmax(42px,1fr))] items-center border-b border-hairline py-1.5 transition-opacity",
                  dim && "opacity-35",
                  best && "bg-paper-2/70",
                )}
              >
                <span role="rowheader" className="flex items-center gap-2 pr-2">
                  <FamilyIcon id={f.id} className="size-7 [&_svg]:size-3.5" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink" title={f.title}>
                      {f.short}
                    </span>
                    {picked.length > 0 && (
                      <span className="block text-[11px] text-muted-foreground">
                        {best ? "Best fit · " : ""}
                        {score}/{max}
                      </span>
                    )}
                  </span>
                </span>
                {SCENARIOS.map((s) => {
                  const [fit] = f.fit[s.id];
                  const selected = cell?.family === f.id && cell.scenario === s.id;
                  return (
                    <span role="cell" key={s.id} className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setCell(selected ? null : { family: f.id, scenario: s.id })}
                        aria-label={`${f.title}, ${s.label}: ${FIT_LABEL[fit]}`}
                        aria-pressed={selected}
                        className={cn(
                          "inline-flex size-8 items-center justify-center rounded-full transition-colors hover:bg-paper-2",
                          selected && "ring-2 ring-ink",
                          picked.includes(s.id) && "bg-paper-2",
                        )}
                      >
                        <FitMark fit={fit} />
                      </button>
                    </span>
                  );
                })}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div aria-live="polite" className="min-h-[3.5rem]">
        {detail && detailFit ? (
          <div
            className="mt-4 flex flex-wrap items-start gap-3 rounded-lg border-l-2 bg-paper-2 p-3 text-sm"
            style={{ borderColor: `var(--dg-${FIT_TONE[detailFit[0]]})` }}
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink">
                {detail.fam.title} × {detail.sc.label}: {FIT_LABEL[detailFit[0]]}
              </div>
              <div className="mt-0.5 text-ink-2">{detailFit[1]}</div>
            </div>
            <Link
              href={detail.fam.href}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-primary no-underline!"
            >
              Read about {detail.fam.short} <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : compact ? (
          <Link
            href="/system-design/databases/choosing-a-database"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary no-underline! hover:underline!"
          >
            Not sure? Try the database picker and workload cookbook <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Ratings are rules of thumb for typical deployments. Every product in a family differs a little.
          </p>
        )}
      </div>
    </div>
  );
}
