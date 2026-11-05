import { cn } from "@/lib/utils";
import {
  AWS_COMPUTE_OPTIONS,
  LAYERS,
  OWNER_LABEL,
  type Owner,
  type ResponsibilityOption,
} from "@/lib/cloud-catalog";

// Who runs each layer for a set of compute options, from "you run everything" (left) to "you run only code"
// (right). Usage in MDX: <ResponsibilityGrid set="aws-compute" />
const SETS: Record<string, ResponsibilityOption[]> = {
  "aws-compute": AWS_COMPUTE_OPTIONS,
};

const OWNER_STYLE: Record<Owner, { bg: string; fg: string }> = {
  you: { bg: "var(--dg-orange-soft)", fg: "var(--dg-orange)" },
  shared: { bg: "var(--dg-teal-soft)", fg: "var(--dg-teal)" },
  provider: { bg: "var(--paper-2)", fg: "var(--muted-foreground)" },
};

export function ResponsibilityGrid({ set }: { set: string }) {
  const options = SETS[set];
  if (!options) return <p className="text-sm text-muted-foreground">Unknown option set: {set}</p>;

  return (
    <figure className="my-8 rounded-xl border border-hairline bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Who runs what
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(Object.keys(OWNER_LABEL) as Owner[]).map((o) => (
            <span key={o} className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm border" style={{ background: OWNER_STYLE[o].bg, borderColor: OWNER_STYLE[o].fg }} />
              {OWNER_LABEL[o]}
            </span>
          ))}
        </div>
      </div>

      {/* Scrolls sideways on phones rather than squeezing six columns into the page width. */}
      <div className="mt-4 overflow-x-auto">
        <div
          role="table"
          aria-label="Who runs each layer for each compute option"
          className="grid min-w-[640px] gap-1 text-sm"
          style={{ gridTemplateColumns: `9.5rem repeat(${options.length}, minmax(0, 1fr))` }}
        >
          <div role="row" className="contents">
            <span role="columnheader" />
            {options.map((o) => (
              <div key={o.id} role="columnheader" className="self-end px-1 pb-1">
                <div className="font-display font-semibold leading-tight text-ink">{o.label}</div>
                <div className="text-xs text-muted-foreground">{o.sub}</div>
              </div>
            ))}
          </div>
          {LAYERS.map((l) => (
            <div key={l.id} role="row" className="contents">
              <div role="rowheader" className="self-center pr-2 text-[13px] font-medium leading-tight text-ink-2">
                {l.label}
              </div>
              {options.map((o) => {
                const owner = o.owners[l.id];
                const st = OWNER_STYLE[owner];
                return (
                  <div
                    key={o.id}
                    role="cell"
                    className={cn("flex h-9 items-center justify-center rounded-md px-2 text-xs font-medium")}
                    style={{ background: st.bg, color: st.fg }}
                    title={`${o.label}: ${l.label}: ${OWNER_LABEL[owner]}`}
                  >
                    {owner === "you" ? "You" : owner === "shared" ? "Configure" : "Cloud"}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-muted-foreground">
        Moving right trades control for less operational work. Your code is always yours.
      </figcaption>
    </figure>
  );
}
