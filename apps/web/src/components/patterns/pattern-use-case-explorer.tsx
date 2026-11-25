"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { PATTERN_BY_SLUG, PATTERNS, USE_CASES, computeMatches, type PatternTierFilter } from "@/lib/pattern-catalog";
import { setPatternFilter } from "@/lib/pattern-filter.client";

// The top of /system-design/patterns: pick a use case (single select) and/or a tier, and the hub grid below
// highlights the matching cards and dims the rest (through the shared store in pattern-filter.client.ts). A recipe
// panel lists the use case's foundational and interview-edge patterns with the reason each one is there.

const CHIP =
  "rounded-full border px-3 py-1 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const CHIP_ON = "border-ink bg-ink text-paper";
const CHIP_OFF = "border-hairline bg-paper text-ink-2 hover:border-ink/40";

export function PatternUseCaseExplorer() {
  const [useCase, setUseCase] = useState<string | null>(null);
  const [tier, setTier] = useState<PatternTierFilter>("all");

  const matches = useMemo(() => computeMatches({ useCase, tier }), [useCase, tier]);

  useEffect(() => {
    setPatternFilter(matches);
  }, [matches]);
  // The store is module-level: clear it when the hub unmounts, so the next page never opens dimmed.
  useEffect(() => () => setPatternFilter(null), []);

  const counts = useMemo(
    () => ({
      all: PATTERNS.length,
      core: PATTERNS.filter((p) => p.tier === "core").length,
      advanced: PATTERNS.filter((p) => p.tier === "advanced").length,
    }),
    []
  );
  const tiers: { id: PatternTierFilter; label: string }[] = [
    { id: "all", label: `All patterns (${counts.all})` },
    { id: "core", label: `Foundational (${counts.core})` },
    { id: "advanced", label: `Advanced · Interview edge (${counts.advanced})` },
  ];

  const selected = USE_CASES.find((u) => u.id === useCase) ?? null;
  const recipe = selected
    ? selected.patterns
        .map((e) => ({ ...e, pattern: PATTERN_BY_SLUG.get(e.slug)! }))
        .filter((e) => tier === "all" || e.pattern.tier === tier)
    : [];
  const coreList = recipe.filter((e) => e.role === "core");
  const edgeList = recipe.filter((e) => e.role === "edge");
  const active = useCase !== null || tier !== "all";
  const n = matches?.size ?? 0;

  return (
    <div className="not-prose my-8 rounded-xl border border-hairline bg-paper p-4 sm:p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Which patterns does my design need?
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a use case to see its recipe and highlight its patterns below. Filter by tier to see only the foundations
        or only the patterns that set a senior answer apart.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Pattern tier">
        {tiers.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tier === t.id}
            onClick={() => setTier(t.id)}
            className={cn(CHIP, "inline-flex items-center gap-1", tier === t.id ? CHIP_ON : CHIP_OFF)}
          >
            {t.id === "advanced" && <Zap aria-hidden className="size-3" />}
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Use cases">
        {USE_CASES.map((u) => {
          const on = useCase === u.id;
          return (
            <button
              key={u.id}
              type="button"
              aria-pressed={on}
              onClick={() => setUseCase(on ? null : u.id)}
              className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
            >
              {u.label}
            </button>
          );
        })}
        {active && (
          <button
            type="button"
            onClick={() => {
              setUseCase(null);
              setTier("all");
            }}
            className="px-2 py-1 text-[13px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <p aria-live="polite" className="mt-3 text-[13px] text-muted-foreground">
        {active ? `${n} ${n === 1 ? "pattern" : "patterns"} highlighted` : ""}
      </p>

      {selected && (
        <div className="mt-3 rounded-lg border border-hairline bg-paper-2/60 p-4" data-testid="pattern-recipe">
          <p className="text-sm text-ink">{selected.blurb}</p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <RecipeList title="Foundational" items={coreList} />
            <RecipeList title="Interview edge" items={edgeList} edge />
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground">
            Case studies:{" "}
            {selected.caseStudies.map((c, i) => (
              <span key={c.href}>
                {i > 0 && " · "}
                <Link href={c.href} className="text-ink underline underline-offset-2">
                  {c.title}
                </Link>
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

function RecipeList({
  title,
  items,
  edge = false,
}: {
  title: string;
  items: { slug: string; why: string; pattern: { href: string; title: string; edge?: string } }[];
  edge?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {edge && <Zap aria-hidden className="size-3 text-tint" />}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted-foreground">None in this tier.</p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {items.map((e) => (
            <li key={e.slug} className="text-[13px] leading-snug">
              <Link href={e.pattern.href} className="font-medium text-ink underline underline-offset-2">
                {e.pattern.title}
              </Link>
              <span className="text-ink-2">: {e.why}</span>
              {edge && e.pattern.edge && <span className="mt-0.5 block text-muted-foreground">{e.pattern.edge}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
