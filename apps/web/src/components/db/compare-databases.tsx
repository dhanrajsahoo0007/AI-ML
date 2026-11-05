"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FAMILIES,
  FAMILY_BY_ID,
  RATING_LABELS,
  SCENARIOS,
  type DbFamily,
  type FamilyId,
  type RatingKey,
} from "@/lib/db-catalog";
import { FAMILY_TONE, FIT_LABEL, FamilyIcon, FitMark } from "./shared";

// Side-by-side comparison of two database families: profile facts, mirrored rating bars, and the workloads
// where they differ. Usage in MDX: <CompareDatabases a="relational" b="document" />
export function CompareDatabases({ a = "relational", b = "document" }: { a?: FamilyId; b?: FamilyId }) {
  const [left, setLeft] = useState<FamilyId>(a);
  const [right, setRight] = useState<FamilyId>(b);
  const L = FAMILY_BY_ID[left];
  const R = FAMILY_BY_ID[right];
  const differ = SCENARIOS.filter((s) => L.fit[s.id][0] !== R.fit[s.id][0]);

  const facts: [string, (f: DbFamily) => string][] = [
    ["Data model", (f) => f.dataModel],
    ["Query style", (f) => f.queryStyle],
    ["Consistency", (f) => f.consistency],
    ["Scales by", (f) => f.scaling],
    ["Latency", (f) => f.latency],
  ];

  return (
    <div className="my-8 rounded-xl border border-hairline bg-paper">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline p-4 sm:p-5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Compare</span>
        <FamilySelect value={left} onChange={setLeft} label="First database family" />
        <button
          type="button"
          onClick={() => {
            setLeft(right);
            setRight(left);
          }}
          aria-label="Swap"
          className="inline-flex size-8 items-center justify-center rounded-full border border-hairline text-muted-foreground transition-colors hover:border-ink hover:text-ink"
        >
          <ArrowLeftRight className="size-3.5" />
        </button>
        <FamilySelect value={right} onChange={setRight} label="Second database family" />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${left}-${right}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          <div className="grid grid-cols-2 divide-x divide-hairline border-b border-hairline">
            {[L, R].map((f) => (
              <div key={f.id} className="flex items-start gap-2.5 p-4 sm:p-5">
                <FamilyIcon id={f.id} className="hidden sm:inline-flex" />
                <div className="min-w-0">
                  <Link href={f.href} className="font-display font-semibold text-ink no-underline! hover:underline!">
                    {f.title}
                  </Link>
                  <div className="mt-1 text-[13px] leading-snug text-muted-foreground">{f.tagline}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Mirrored bars: left family grows leftwards from the centre, right family rightwards. */}
          <div className="space-y-2 border-b border-hairline p-4 sm:p-5">
            {(Object.keys(RATING_LABELS) as RatingKey[]).map((k) => (
              <div key={k} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                <Bar value={L.ratings[k]} tone={FAMILY_TONE[L.id]} flip win={L.ratings[k] > R.ratings[k]} />
                <span className="w-24 text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.04em] text-muted-foreground sm:w-40 sm:text-xs">
                  {RATING_LABELS[k]}
                </span>
                <Bar value={R.ratings[k]} tone={FAMILY_TONE[R.id]} win={R.ratings[k] > L.ratings[k]} />
              </div>
            ))}
          </div>

          <div className="divide-y divide-hairline border-b border-hairline">
            {facts.map(([label, get]) => (
              <div key={label} className="px-4 py-2.5 sm:px-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
                <div className="mt-1 grid grid-cols-2 gap-4 text-sm text-ink-2">
                  <span>{get(L)}</span>
                  <span>{get(R)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Where they differ ({differ.length} of {SCENARIOS.length} workloads)
            </div>
            {differ.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Same fit on every workload.</p>
            ) : (
              <div className="mt-2 divide-y divide-hairline">
                {differ.map((s) => (
                  <div key={s.id} className="grid grid-cols-2 gap-4 py-2 text-sm sm:grid-cols-[10rem_1fr_1fr]">
                    <span className="col-span-2 font-medium text-ink sm:col-span-1">{s.label}</span>
                    {[L, R].map((f) => (
                      <span key={f.id} className="flex gap-2 text-ink-2">
                        <FitMark fit={f.fit[s.id][0]} className="mt-1 shrink-0" />
                        <span>
                          <span className="sr-only">{FIT_LABEL[f.fit[s.id][0]]}: </span>
                          {f.fit[s.id][1]}
                        </span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FamilySelect({
  value,
  onChange,
  label,
}: {
  value: FamilyId;
  onChange: (v: FamilyId) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as FamilyId)}
      className="h-8 rounded-full border border-hairline bg-paper px-3 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {FAMILIES.map((f) => (
        <option key={f.id} value={f.id}>
          {f.title}
        </option>
      ))}
    </select>
  );
}

function Bar({ value, tone, flip = false, win }: { value: number; tone: string; flip?: boolean; win: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", flip && "flex-row-reverse")}>
      <div className={cn("h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2", flip && "flex justify-end")}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `var(--dg-${tone})`, opacity: win ? 1 : 0.55 }}
          initial={{ width: 0 }}
          animate={{ width: `${value * 20}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <span className={cn("w-3 text-center text-xs tabular-nums", win ? "font-semibold text-ink" : "text-muted-foreground")}>
        {value}
      </span>
    </div>
  );
}
