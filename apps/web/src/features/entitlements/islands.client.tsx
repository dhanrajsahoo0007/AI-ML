"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { REFRESH_EARLY_SEC, REFRESH_PATH, hintFromCookies, refreshDue, type EntitlementHint } from "./hint";

// Tiny client islands for the entitlement cookie (plan §9.2). Signed-out visitors have no hint cookie, so they
// never call the API. Nothing here decides access: middleware does, from the HttpOnly `tts_ent` cookie.

const nowSec = () => Math.floor(Date.now() / 1000);

/** Re-issues `tts_ent` from the server. Resolves to the new tier, or null when signed out or on error. */
export async function refreshEntitlement(): Promise<"free" | "pro" | null> {
  try {
    const res = await fetch(REFRESH_PATH, { method: "POST", credentials: "same-origin" });
    if (!res.ok) return null;
    const body = (await res.json()) as { tier?: string };
    return body.tier === "pro" || body.tier === "free" ? body.tier : null;
  } catch {
    return null;
  }
}

const RELOAD_KEY = "tts_paywall_reload";

/**
 * On a paywalled preview: a signed-in reader whose cookie expired gets it re-issued, and if they have Pro the
 * page reloads once to show the full article. A loop guard stops repeated reloads of the same page.
 */
export function PaywallUnlock() {
  useEffect(() => {
    if (!hintFromCookies(document.cookie)) return;
    void refreshEntitlement().then((tier) => {
      if (tier !== "pro") return;
      const key = `${RELOAD_KEY}:${location.pathname}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        return;
      }
      location.reload();
    });
  }, []);
  return null;
}

/**
 * Keeps a signed-in reader's `tts_ent` fresh while they read (refresh shortly before it expires) and shows the
 * payment-on-hold banner during the grace period.
 */
export function EntitlementKeeper() {
  const [hint, setHint] = useState<EntitlementHint | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      const current = hintFromCookies(document.cookie);
      setHint(current);
      if (!current) return;
      if (refreshDue(current, nowSec())) {
        if (document.visibilityState === "visible") {
          void refreshEntitlement().then((tier) => {
            if (tier) schedule();
            else setHint(null);
          });
        }
        return;
      }
      timer = setTimeout(schedule, (current.exp - REFRESH_EARLY_SEC - nowSec()) * 1000);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, []);

  if (!hint?.hold) return null;
  return (
    <div
      role="status"
      data-testid="on-hold-banner"
      className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-[14px] text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      Your last payment didn&apos;t go through. Pro stays on for a few days while you{" "}
      <Link href="/account/billing" className="font-medium underline underline-offset-2">
        update your payment method
      </Link>
      .
    </div>
  );
}
