"use client";

import { useEffect, useState } from "react";
import { safeNextPath } from "@/features/auth/public";
import { refreshEntitlement } from "@/features/entitlements/islands.client";
import { clearLocalProgress, readLocalProgress } from "./local";

// Tiny island on /sign-in/complete: merges signed-out progress into the new session, refreshes the entitlement
// cookie, then continues to `next` (a same-origin path only: safeNextPath, shared with the sign-in page).

export function MergeLocalProgress() {
  const [status, setStatus] = useState("Finishing sign-in…");

  useEffect(() => {
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    const items = readLocalProgress();
    // Issue the entitlement cookie (plan §9.2) before continuing, so a Pro reader lands on full articles.
    const done = () => void refreshEntitlement().finally(() => window.location.replace(next));
    if (!items.length) return done();
    setStatus("Saving the progress from this browser to your account…");
    fetch("/api/progress/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then((res) => {
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
