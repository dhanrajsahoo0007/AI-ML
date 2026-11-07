"use client";

import { useId, useState } from "react";

// Account page actions. Plain same-origin fetches (the route() wrapper checks Origin and the session).

type ApiError = { error?: { code?: string; message?: string } };

const REAUTH_URL = "/sign-in?reauth=1&callbackURL=%2Faccount%2Fdata";

async function errorOf(res: Response): Promise<ApiError["error"]> {
  return ((await res.json().catch(() => ({}))) as ApiError).error ?? {};
}

const buttonClass =
  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export function SignOutEverywhereButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/account/sessions", { method: "DELETE" }).catch(() => null);
          if (res?.ok) return window.location.assign("/");
          setError("Couldn't sign out everywhere. Please try again.");
          setBusy(false);
        }}
        className={`${buttonClass} border border-ink/20 text-ink hover:border-ink hover:bg-ink hover:text-paper`}
      >
        {busy ? "Signing out…" : "Sign out everywhere"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function ExportDataButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch("/api/account/export").catch(() => null);
          if (res?.ok) {
            const blob = await res.blob();
            const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "export.json";
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = name;
            document.body.append(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 1_000);
          } else if (res && (await errorOf(res))?.code === "reauth_required") {
            return window.location.assign(REAUTH_URL);
          } else {
            setError("Couldn't prepare your export. Please try again.");
          }
          setBusy(false);
        }}
        className={`${buttonClass} bg-ink text-paper hover:bg-primary`}
      >
        {busy ? "Preparing…" : "Download my data (JSON)"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function DeleteAccountForm() {
  const id = useId();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/account/delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirm: typed }),
        }).catch(() => null);
        if (res?.ok) return window.location.assign("/?account=deleted");
        const err = res ? await errorOf(res) : undefined;
        if (err?.code === "reauth_required") return window.location.assign(REAUTH_URL);
        setError(err?.message ?? "Couldn't delete your account. Please try again.");
        setBusy(false);
      }}
    >
      <label htmlFor={`${id}-confirm`} className="block text-[15px] text-ink">
        Type <strong>DELETE</strong> to confirm
      </label>
      <input
        id={`${id}-confirm`}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        className="w-full max-w-xs rounded-lg border border-hairline bg-paper px-3 py-2 text-[15px] text-ink"
      />
      <div>
        <button
          type="submit"
          disabled={busy || typed !== "DELETE"}
          className={`${buttonClass} bg-red-700 text-white hover:bg-red-800`}
        >
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
