"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, RotateCcw } from "lucide-react";
import { DECISION_TREES, type TreeOption } from "@/lib/cloud-catalog";
import { PROVIDER_ORDER, PROVIDER_TONE, ProviderTag, ServiceChip } from "./shared";

// A cloud decision tree, one question at a time, ending on a recommendation with the matching service on each
// cloud. Earlier answers stay visible as chips you can jump back to. Same interaction as the database picker.
// Usage in MDX: <CloudDecisionTree topic="compute" />
export function CloudDecisionTree({ topic }: { topic: string }) {
  const tree = DECISION_TREES[topic];
  const [trail, setTrail] = useState<{ q: string; opt: TreeOption }[]>([]);
  if (!tree) return <p className="text-sm text-muted-foreground">Unknown decision tree: {topic}</p>;

  const at = trail.length ? trail[trail.length - 1].opt.next : tree.start;
  const question = tree.questions.find((q) => q.id === at);
  const result = tree.results.find((r) => r.id === at);

  const choose = (opt: TreeOption) => setTrail((t) => [...t, { q: at, opt }]);
  const back = () => setTrail((t) => t.slice(0, -1));
  const jump = (i: number) => setTrail((t) => t.slice(0, i));

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-paper-2/60 px-4 py-3 sm:px-5">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tree.title}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {trail.map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => jump(i)}
              title={`Change: ${tree.questions.find((q) => q.id === t.q)?.prompt ?? ""}`}
              className="rounded-full border border-hairline bg-paper px-2.5 py-0.5 text-xs text-ink-2 transition-colors hover:border-ink"
            >
              {t.opt.label}
            </button>
          ))}
        </div>
        {trail.length > 0 && (
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-ink"
            >
              <ChevronLeft className="size-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => setTrail([])}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-ink"
            >
              <RotateCcw className="size-3" /> Start over
            </button>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={at}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            {question && (
              <>
                <div className="text-xs text-muted-foreground">Question {trail.length + 1}</div>
                <div className="mt-1 font-display text-xl font-semibold text-ink">{question.prompt}</div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {question.options.map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => choose(o)}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-hairline bg-paper px-3.5 py-3 text-left transition-colors hover:border-ink hover:bg-paper-2/60 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{o.label}</span>
                        {o.hint && <span className="mt-0.5 block text-[13px] text-muted-foreground">{o.hint}</span>}
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {result && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--dg-green)" }}>
                  Recommendation
                </div>
                <div className="mt-1.5 font-display text-2xl font-semibold leading-tight text-ink">
                  {result.headline}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border-l-2 bg-paper-2/60 p-3" style={{ borderColor: "var(--dg-green)" }}>
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                      style={{ color: "var(--dg-green)" }}
                    >
                      Why
                    </div>
                    <div className="mt-1 text-sm text-ink-2">{result.why}</div>
                  </div>
                  <div className="rounded-lg border-l-2 bg-paper-2/60 p-3" style={{ borderColor: "var(--dg-orange)" }}>
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                      style={{ color: "var(--dg-orange)" }}
                    >
                      Trade-off to say out loud
                    </div>
                    <div className="mt-1 text-sm text-ink-2">{result.tradeoff}</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    On each cloud
                  </div>
                  {PROVIDER_ORDER.map((p) => (
                    <div
                      key={p}
                      className="flex flex-wrap items-center gap-1.5 rounded-lg px-2 py-1.5"
                      style={p === "aws" ? { background: `var(--dg-${PROVIDER_TONE[p]}-soft)` } : undefined}
                    >
                      <ProviderTag id={p} className="w-14 justify-center" />
                      {result.answer[p].map((s) => (
                        <ServiceChip key={s} name={s} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
