"use client";

import { useEffect, useState } from "react";

// The button on the confirm and unsubscribe pages. The pages are static; the token comes from the link's query
// string, read in the browser, and is posted only when the person clicks (link scanners open links but don't click).

type Phase = "loading" | "ready" | "missing" | "working" | "done" | "failed";

interface TokenActionProps {
  endpoint: string;
  button: string;
  done: string;
  /** Messages for error codes from the API ({ error: { code } }), plus `default`. */
  errors: Record<string, string> & { default: string };
  missing: string;
}

export function TokenAction({ endpoint, button, done, errors, missing }: TokenActionProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(t);
    setPhase(t ? "ready" : "missing");
  }, []);

  async function run() {
    setPhase("working");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setPhase("done");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
      setMessage(errors[body.error?.code ?? ""] ?? errors.default);
    } catch {
      setMessage(errors.default);
    }
    setPhase("failed");
  }

  if (phase === "missing") return <p className="text-[15px] text-muted-foreground">{missing}</p>;
  if (phase === "done") {
    return (
      <p role="status" className="rounded-xl border border-hairline bg-paper-2/60 p-4 text-[15px] text-ink">
        {done}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={run}
        disabled={phase !== "ready" && phase !== "failed"}
        className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-primary disabled:opacity-60"
      >
        {phase === "working" ? "Working…" : button}
      </button>
      {phase === "failed" && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
