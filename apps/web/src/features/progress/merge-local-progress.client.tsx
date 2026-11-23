"use client";

import { useEffect, useState } from "react";
import { safeNextPath } from "@/features/auth/public";
import { refreshEntitlement } from "@/features/entitlements/islands.client";
import { clearLocalProgress, hydrateLocalProgress, readLocalProgress } from "./local";

// Tiny island on /sign-in/complete: merges signed-out progress into the new session, hydrates this browser's
// synced progress cache from the account, refreshes the entitlement cookie, then continues to `next` (a
// same-origin path only: safeNextPath, shared with the sign-in page).

async function pullAccountProgress(): Promise<void> {
  try {
    const res = await fetch("/api/progress", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as {
      progress?: { contentKey: string; completedAt: string | null }[];
      bookmarks?: { contentKey: string }[];
    } | null;
    if (!body) return;
    hydrateLocalProgress(
      (body.progress ?? []).filter((p) => p.completedAt).map((p) => p.contentKey),
      (body.bookmarks ?? []).map((b) => b.contentKey)
    );
  } catch {
    // Offline or blocked: the account page or next sign-in will hydrate.
  }
}

export function MergeLocalProgress() {
  const [status, setStatus] = useState("Finishing sign-in…");

  useEffect(() => {
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    const items = readLocalProgress();
    // Issue the entitlement cookie (plan §9.2) before continuing, so a Pro reader lands on full articles.
    // `next` is a same-origin path from safeNextPath above (security review M1), never raw input.
    const done = () =>
      void refreshEntitlement()
        .then((tier) => (tier ? pullAccountProgress() : undefined))
        .finally(() => {
          // nosemgrep: javascript.browser.security.open-redirect.js-open-redirect
          window.location.replace(next);
        });
    if (!items.length) return done();
    setStatus("Saving the progress from this browser to your account…");
    const send = (list: typeof items) =>
      fetch("/api/progress/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: list }),
      });
    send(items)
      .then(async (res) => {
        // Pages that no longer exist (or a hidden section's) are refused by key: drop those and send the rest once.
        if (res.status === 400) {
          const details = ((await res.json().catch(() => null)) as { error?: { details?: { path?: string }[] } } | null)
            ?.error?.details;
          const bad = new Set(
            (details ?? []).flatMap((d) => {
              const m = /^items\.(\d+)\./.exec(d.path ?? "");
              return m ? [Number(m[1])] : [];
            })
          );
          const rest = items.filter((_, i) => !bad.has(i));
          if (bad.size === 0) return;
          if (rest.length === 0) return clearLocalProgress();
          res = await send(rest);
        }
        if (res.ok) clearLocalProgress();
      })
      .catch(() => {})
      .finally(done);
  }, []);

  return (
    <p role="status" className="mt-4 text-[15px] text-muted-foreground">
      {status}
    </p>
  );
}
