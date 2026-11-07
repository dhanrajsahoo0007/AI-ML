"use client";

import { useEffect, useState } from "react";
import { clearLocalProgress, readLocalProgress } from "./local";

// Tiny island on /sign-in/complete: merges signed-out progress into the new session, then continues to
// `next` (a same-site path only).

function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/account";
}

export function MergeLocalProgress() {
  const [status, setStatus] = useState("Finishing sign-in…");

  useEffect(() => {
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    const items = readLocalProgress();
    const done = () => window.location.replace(next);
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
