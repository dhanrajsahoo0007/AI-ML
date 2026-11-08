"use client";

import * as React from "react";

const DAY = 24 * 60 * 60 * 1000;

function relative(iso: string, now: Date) {
  const then = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return `on ${then.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

// "Updated today / 3 days ago / on Nov 2, 2026". Rendered in the reader's time zone, so it is computed
// after mount; the server renders the absolute date to avoid a hydration mismatch.
export function UpdatedDate({ iso }: { iso: string }) {
  const [label, setLabel] = React.useState(
    () =>
      `on ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
  );
  React.useEffect(() => setLabel(relative(iso, new Date())), [iso]);
  return (
    <time dateTime={iso} title={new Date(iso).toUTCString()} className="text-sm text-muted-foreground">
      Updated {label}
    </time>
  );
}
