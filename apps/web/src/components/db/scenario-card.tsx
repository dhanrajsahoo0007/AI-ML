"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye } from "lucide-react";

// A workload puzzle: the problem is shown first so the reader can decide, then "Reveal" shows the pick and
// the reasoning (MDX children). Usage in MDX:
//   <ScenarioCard workload="Read-heavy" title="Profile pages" problem="..." pick="PostgreSQL + Redis">...</ScenarioCard>
export function ScenarioCard({
  workload,
  title,
  problem,
  pick,
  children,
}: {
  workload: string;
  title: string;
  problem: string;
  pick: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
          style={{ background: "var(--dg-blue-soft)", color: "var(--dg-blue)" }}
        >
          {workload}
        </span>
        <span className="font-display font-semibold text-ink">{title}</span>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{problem}</p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
        >
          <Eye className="size-3.5" /> Decide, then reveal
        </button>
      ) : null}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-lg border-l-2 bg-paper-2/60 p-3" style={{ borderColor: "var(--dg-green)" }}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--dg-green)" }}>
                Pick
              </div>
              <div className="mt-0.5 font-semibold text-ink">{pick}</div>
              <div className="mt-2 text-sm leading-relaxed text-ink-2 [&>*+*]:mt-2">{children}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 text-xs text-muted-foreground hover:text-ink"
            >
              Hide answer
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Lays scenario cards out two-up on wide screens.
export function ScenarioGrid({ children }: { children: React.ReactNode }) {
  return <div className="my-8 grid gap-3 md:grid-cols-2">{children}</div>;
}
