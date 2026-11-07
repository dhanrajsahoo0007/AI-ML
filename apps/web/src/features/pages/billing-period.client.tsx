"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Period = "monthly" | "yearly";

// Monthly/yearly switch for the pricing page. The cards are server-rendered; this island only sets
// `data-period` on its wrapper, and the price lines show or hide with `group-data-[period=…]` variants.
export function BillingPeriod({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<Period>("monthly");
  const option = (value: Period, label: React.ReactNode) => (
    <button
      type="button"
      role="radio"
      aria-checked={period === value}
      onClick={() => setPeriod(value)}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        period === value ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"
      )}
    >
      {label}
    </button>
  );
  return (
    <div data-period={period} className="group">
      <div className="flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="inline-flex items-center gap-1 rounded-full border border-hairline bg-paper p-1"
        >
          {option("monthly", "Monthly")}
          {option(
            "yearly",
            <>
              Yearly <span className="ml-1 text-xs opacity-80">save ~2 months</span>
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
