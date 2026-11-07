import Link from "next/link";
import { cn } from "@/lib/utils";
import { NO_DATA, sparklinePoints } from "./format";

// Small server-rendered building blocks for the admin pages: no chart library, no client JavaScript.

export const ADMIN_PAGES = [
  { href: "/admin", label: "KPIs" },
  { href: "/admin/webhooks", label: "Webhooks" },
  { href: "/admin/sections", label: "Sections" },
  { href: "/admin/assets", label: "Assets" },
  { href: "/admin/audit", label: "Audit log" },
] as const;

export function AdminShell({
  current,
  title,
  lead,
  viewer,
  children,
}: {
  current: (typeof ADMIN_PAGES)[number]["href"];
  title: string;
  lead?: React.ReactNode;
  viewer: { email: string };
  children: React.ReactNode;
}) {
  return (
    // data-copy-ok="page": the admin pages are tools, not content, so copy protection stays out of the way.
    <div data-copy-ok="page" data-testid="admin-page" className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Admin · read-only
        </p>
        <p className="text-[13px] text-muted-foreground">Signed in as {viewer.email}</p>
      </div>
      <nav aria-label="Admin" className="mt-4 flex flex-wrap gap-2 border-b border-hairline pb-4">
        {ADMIN_PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            prefetch={false}
            aria-current={p.href === current ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-[14px] transition-colors",
              p.href === current ? "bg-ink text-paper" : "text-muted-foreground hover:bg-paper-2 hover:text-ink"
            )}
          >
            {p.label}
          </Link>
        ))}
      </nav>
      <h1 className="mt-8 font-display text-3xl tracking-tight sm:text-4xl">{title}</h1>
      {lead && <p className="mt-2 max-w-3xl text-[15px] text-muted-foreground">{lead}</p>}
      <div className="mt-8 space-y-10">{children}</div>
    </div>
  );
}

export function Panel({
  title,
  note,
  children,
  testId,
}: {
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section aria-label={title} data-testid={testId}>
      <h2 className="font-display text-xl tracking-tight">{title}</h2>
      {note && <p className="mt-1 text-[13px] text-muted-foreground">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

type Tone = "ok" | "warn" | "alert" | undefined;

const toneClass: Record<NonNullable<Tone>, string> = {
  ok: "border-emerald-600/30",
  warn: "border-amber-500/50",
  alert: "border-red-600/60 bg-red-600/5",
};

export function Stat({
  label,
  value,
  hint,
  tone,
  testId,
  children,
}: {
  label: string;
  /** null shows "no data yet". */
  value: React.ReactNode | null;
  hint?: React.ReactNode;
  tone?: Tone;
  testId?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn("rounded-xl border border-hairline bg-paper p-4", tone && toneClass[tone])}
      data-testid={testId}
      data-tone={tone}
    >
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl tracking-tight text-ink" data-value>
        {value === null ? <span className="text-base text-muted-foreground">{NO_DATA}</span> : value}
      </p>
      {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function Sparkline({
  values,
  label,
  width = 240,
  height = 40,
}: {
  values: readonly number[];
  label: string;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="mt-3 max-w-full text-primary"
      data-testid="sparkline"
    >
      <polyline
        points={sparklinePoints(values, width, height)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface Column<Row> {
  header: string;
  cell: (row: Row) => React.ReactNode;
  align?: "right";
}

export function Table<Row>({
  columns,
  rows,
  rowKey,
  empty = NO_DATA,
  testId,
}: {
  columns: Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  empty?: string;
  testId?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-hairline p-4 text-[14px] text-muted-foreground" data-testid={testId}>
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <table className="w-full border-collapse text-[14px]" data-testid={testId}>
        <thead className="bg-paper-2 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c.header} scope="col" className={cn("px-3 py-2 font-medium", c.align === "right" && "text-right")}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td
                  key={c.header}
                  className={cn("px-3 py-2 align-top", c.align === "right" && "text-right tabular-nums")}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
