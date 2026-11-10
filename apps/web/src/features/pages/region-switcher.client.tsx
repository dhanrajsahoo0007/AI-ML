"use client";

import { useEffect, useState } from "react";
import { REGION_COOKIE, normalizeCountry } from "@/config/pricing-tiers";

// The pricing page's region switcher (plan §9.5). The page is prerendered per price tier and middleware picks the
// variant (server/edge/pricing-variant.ts); this island only stores the visitor's choice in the `tts_region` cookie
// and reloads /pricing. "Your location" clears the cookie. A form with a button rather than a change handler on the
// select, so moving through the list with the keyboard never reloads the page (WCAG 3.2.2).

const AUTO = "";
const YEAR_SECONDS = 365 * 24 * 60 * 60;

function readCookie(): string {
  const m = document.cookie.match(new RegExp(`(?:^|; )${REGION_COOKIE}=([^;]*)`));
  return normalizeCountry(m?.[1]) ?? AUTO;
}

export function RegionSwitcher({ countries }: { countries: { code: string; name: string }[] }) {
  // Starts on "Your location" (the server render); the stored choice is applied after hydration.
  const [region, setRegion] = useState(AUTO);
  useEffect(() => setRegion(readCookie()), []);

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = region
      ? `${REGION_COOKIE}=${region}; Path=/; Max-Age=${YEAR_SECONDS}; SameSite=Lax${secure}`
      : `${REGION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    window.location.assign("/pricing");
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-center justify-center gap-2" data-testid="region-switcher">
      <label htmlFor="pricing-region" className="text-sm font-medium text-ink">
        Show prices for
      </label>
      <select
        id="pricing-region"
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="max-w-60 rounded-full border border-hairline bg-paper px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <option value={AUTO}>Your location</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
        <option value="ZZ">Another country</option>
      </select>
      <button
        type="submit"
        className="rounded-full border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Update prices
      </button>
    </form>
  );
}
