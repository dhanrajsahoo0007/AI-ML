"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { nextTabIndex } from "./tabs-keys";
import { InvalidProps } from "./props";

// Generic tabs, same look as DataModelView. Usage in MDX:
//   <Tabs title="Two ways to shard">
//     <Tab label="By user id">…</Tab>
//     <Tab label="By region">…</Tab>
//   </Tabs>
// Keyboard: arrow keys move between tabs (roving tabindex), Home/End jump to the ends.

export function Tab({ children }: { label: string; children: React.ReactNode }) {
  return <>{children}</>;
}

type TabElement = React.ReactElement<{ label: string; children: React.ReactNode }>;

export function Tabs({
  title,
  idBase: baseId,
  children,
}: {
  title?: string;
  /** Id prefix from the server wrapper (./tabs.tsx); a useId here would not match between SSR and hydration. */
  idBase: string;
  children: React.ReactNode;
}) {
  const tabs = React.Children.toArray(children).filter(
    (c): c is TabElement => React.isValidElement(c) && typeof (c.props as { label?: unknown }).label === "string"
  );
  const [active, setActive] = React.useState(0);
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([]);

  if (tabs.length === 0) return <InvalidProps message="<Tabs>: needs at least one <Tab label=…> child" />;
  const current = Math.min(active, tabs.length - 1);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const next = nextTabIndex(current, e.key, tabs.length);
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 pt-3 sm:px-5">
        {title && (
          <span className="pb-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </span>
        )}
        <div role="tablist" aria-label={title} className="flex flex-wrap gap-1">
          {tabs.map((t, i) => (
            <button
              key={t.props.label}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              id={`${baseId}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={i === current}
              aria-controls={`${baseId}-panel-${i}`}
              tabIndex={i === current ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={onKeyDown}
              className={cn(
                "-mb-px border-b-2 px-3 pb-2.5 pt-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                i === current
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent text-muted-foreground hover:text-ink"
              )}
            >
              {t.props.label}
            </button>
          ))}
        </div>
      </div>
      {/* Every panel is rendered (inactive ones hidden), so each tab's aria-controls points at a real element. */}
      {tabs.map((t, i) => (
        <div
          key={t.props.label}
          role="tabpanel"
          id={`${baseId}-panel-${i}`}
          aria-labelledby={`${baseId}-tab-${i}`}
          tabIndex={0}
          hidden={i !== current}
          className="px-4 py-4 sm:px-5 [&>*+*]:mt-3 [&_pre]:my-0"
        >
          {t.props.children}
        </div>
      ))}
    </div>
  );
}
