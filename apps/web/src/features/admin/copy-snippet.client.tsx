"use client";

import { useState } from "react";

// Copies an asset's MDX snippet on /admin/assets. Admin-only tooling: AGENTS.md rule 7 bans copy buttons in
// content areas, not in the admin dashboard.
export function CopySnippetButton({ snippet }: { snippet: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      className="rounded-full border border-hairline px-2.5 py-1 text-[12px] text-ink hover:bg-paper-2"
      data-snippet={snippet}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(snippet);
          setState("copied");
        } catch {
          setState("failed");
        }
        window.setTimeout(() => setState("idle"), 1500);
      }}
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy snippet"}
    </button>
  );
}
