"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

// Tabbed view of the same data in different shapes, e.g. "The data" / "The query", or SQL rows vs a JSON
// document. Usage in MDX:
//   <DataModelView title="A post with its comments">
//     <DataModelTab label="Relational">```sql ...```</DataModelTab>
//     <DataModelTab label="Document">```json ...```</DataModelTab>
//   </DataModelView>
export function DataModelTab({ children }: { label: string; note?: string; children: React.ReactNode }) {
  return <>{children}</>;
}

type TabElement = React.ReactElement<{ label: string; note?: string; children: React.ReactNode }>;

export function DataModelView({ title, children }: { title?: string; children: React.ReactNode }) {
  const tabs = React.Children.toArray(children).filter(
    (c): c is TabElement => React.isValidElement(c) && typeof (c.props as { label?: unknown }).label === "string"
  );
  const [active, setActive] = useState(0);
  const current = tabs[active];

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 pt-3 sm:px-5">
        {title && (
          <span className="pb-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </span>
        )}
        <div role="tablist" aria-label={title ?? "Data model"} className="flex flex-wrap gap-1">
          {tabs.map((t, i) => (
            <button
              key={t.props.label}
              role="tab"
              type="button"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "-mb-px border-b-2 px-3 pb-2.5 pt-1 text-sm transition-colors",
                i === active
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent text-muted-foreground hover:text-ink"
              )}
            >
              {t.props.label}
            </button>
          ))}
        </div>
      </div>
      {current && (
        <div role="tabpanel" className="px-4 py-4 sm:px-5 [&>*+*]:mt-3 [&_pre]:my-0">
          {current.props.note && <p className="text-sm text-muted-foreground">{current.props.note}</p>}
          {current.props.children}
        </div>
      )}
    </div>
  );
}
