import { Check, X } from "lucide-react";
import { FAMILY_BY_ID, RATING_LABELS, type FamilyId, type RatingKey } from "@/lib/db-catalog";
import { FAMILY_TONE, FamilyIcon, RatingDots } from "./shared";

// "At a glance" card for a database family page: profile facts, ratings, examples, and use / avoid lists.
// Usage in MDX: <DbProfile id="relational" />
export function DbProfile({ id, useAvoid = true }: { id: FamilyId; useAvoid?: boolean }) {
  const f = FAMILY_BY_ID[id];
  if (!f) return <p className="text-sm text-muted-foreground">Unknown database family: {id}</p>;
  const tone = FAMILY_TONE[id];
  const facts: [string, string][] = [
    ["Data model", f.dataModel],
    ["Query style", f.queryStyle],
    ["Consistency", f.consistency],
    ["Scales by", f.scaling],
    ["Typical latency", f.latency],
  ];

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div
        className="flex items-start gap-3 border-b border-hairline p-4 sm:p-5"
        style={{ background: `var(--dg-${tone}-soft)` }}
      >
        <FamilyIcon id={id} className="bg-paper" />
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">At a glance</div>
          <div className="mt-0.5 font-display text-lg font-semibold leading-snug text-ink">{f.tagline}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {f.examples.map((e) => (
              <span key={e} className="rounded-full border border-hairline bg-paper px-2.5 py-0.5 text-xs text-ink-2">
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-0 sm:grid-cols-[1.3fr_1fr]">
        <dl className="divide-y divide-hairline border-b border-hairline sm:border-b-0 sm:border-r">
          {facts.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-2.5 text-sm sm:px-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{k}</dt>
              <dd className="text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-2.5 px-4 py-3 sm:px-5">
          {(Object.keys(RATING_LABELS) as RatingKey[]).map((k) => (
            <div key={k} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-2">{RATING_LABELS[k]}</span>
              <RatingDots value={f.ratings[k]} tone={tone} label={RATING_LABELS[k]} />
            </div>
          ))}
        </div>
      </div>

      {useAvoid && (
        <div className="grid border-t border-hairline sm:grid-cols-2">
          <UseList title="Use it when" items={f.useWhen} good />
          <UseList title="Avoid it when" items={f.avoidWhen} />
        </div>
      )}
    </div>
  );
}

function UseList({ title, items, good = false }: { title: string; items: string[]; good?: boolean }) {
  const tone = good ? "var(--dg-green)" : "var(--dg-red)";
  const Icon = good ? Check : X;
  return (
    <div className={good ? "border-b border-hairline p-4 sm:border-b-0 sm:border-r sm:p-5" : "p-4 sm:p-5"}>
      <div className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: tone }}>
        {title}
      </div>
      <div className="mt-2.5 space-y-2">
        {items.map((it) => (
          <div key={it} className="flex gap-2 text-sm leading-snug text-ink-2">
            <Icon className="mt-0.5 size-4 shrink-0" style={{ color: tone }} aria-hidden />
            <span>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
