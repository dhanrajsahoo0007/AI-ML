"use client";

import { useEffect, useState } from "react";
import { refreshEntitlement } from "@/features/entitlements/islands.client";

// After the provider's checkout sends the buyer back (`/account/billing?status=success`). The query string proves
// nothing (plan §9.3): access comes only from the webhook, so this asks the server for a fresh entitlement until
// it says Pro (the webhook usually lands within seconds), then reloads to show the plan.

const ATTEMPTS = 15;
const INTERVAL_MS = 2000;

export function CheckoutReturn({ alreadyPro }: { alreadyPro: boolean }) {
  const [state, setState] = useState<"waiting" | "pro" | "slow">(alreadyPro ? "pro" : "waiting");

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      const tier = await refreshEntitlement();
      if (cancelled) return;
      if (tier === "pro") {
        setState("pro");
        if (!alreadyPro) window.location.replace("/account/billing?status=success");
        return;
      }
      if (++tries >= ATTEMPTS) setState("slow");
      else setTimeout(tick, INTERVAL_MS);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [alreadyPro]);

  const text = {
    waiting: "Payment received. Confirming your Pro access…",
    pro: "You're Pro. Every premium article and answer is open.",
    slow: "Your payment is still being confirmed. This page will show Pro as soon as it is; you can also refresh in a minute.",
  }[state];
  return (
    <p
      role="status"
      data-testid="checkout-return"
      className="rounded-xl border border-hairline bg-paper-2 p-4 text-[15px] text-ink"
    >
      {text}
    </p>
  );
}
