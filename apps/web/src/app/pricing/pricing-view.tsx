import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { ButtonLink, Container, Eyebrow, PageHeader } from "@/components/ui/editorial";
import { business, MOR_NOTICE } from "@/config/business";
import { siteConfig } from "@/config/site";
import {
  LISTED_COUNTRIES,
  TIER_PERCENT,
  formatUsd,
  parseUsd,
  tierPriceUsd,
  TIER_SLUGS,
  type PriceTier,
} from "@/config/pricing-tiers";
import { BillingPeriod } from "@/features/pages/billing-period.client";
import { loadPageDoc } from "@/features/pages";
import { RegionSwitcher } from "@/features/pages/region-switcher.client";

// Base (tier A) prices in USD. Until the real prices are set in config/business.ts, local and preview builds show
// sample prices (the same ones the local payments sandbox charges, scripts/dev-payments.ts) so the paid flow can be
// tried end to end. Staging and production never show a sample: they say "Price announced at launch" instead.
const SAMPLE_PRICES = process.env.APP_ENV === "local" || process.env.APP_ENV === "preview";
const basePrices = resolveBasePrices();

function resolveBasePrices(): { monthly: number; yearly: number; sample: boolean } | null {
  const set = !business.PRICE_MONTHLY_USD.includes("TODO") && !business.PRICE_YEARLY_USD.includes("TODO");
  if (!set) return SAMPLE_PRICES ? { monthly: 9, yearly: 90, sample: true } : null;
  const monthly = parseUsd(business.PRICE_MONTHLY_USD);
  const yearly = parseUsd(business.PRICE_YEARLY_USD);
  // Fails the build rather than showing a price nobody set.
  if (monthly === null || yearly === null) {
    throw new Error('config/business.ts: PRICE_MONTHLY_USD and PRICE_YEARLY_USD must be USD amounts such as "$9"');
  }
  return { monthly, yearly, sample: false };
}

/** The tier's estimated prices, formatted; null when prices aren't announced. */
function pricesFor(tier: PriceTier) {
  if (!basePrices) return null;
  return {
    monthly: formatUsd(tierPriceUsd(basePrices.monthly, tier)),
    yearly: formatUsd(tierPriceUsd(basePrices.yearly, tier)),
    sample: basePrices.sample,
  };
}

/** The region switcher's countries, named in English at build time (no country list in the client bundle). */
function switcherCountries() {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return LISTED_COUNTRIES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, "en")
  );
}

/** Static params of the `[tier]` variant routes: one page each for tiers B and C (tier A is the base route). */
export function pricingTierParams() {
  return Object.values(TIER_SLUGS).map((tier) => ({ tier }));
}

// Every variant shares this, so /pricing stays the canonical URL whichever variant middleware serves there. The
// variants aren't marked noindex here (that would de-index /pricing itself when middleware serves one at it):
// requested at their own URLs they get `X-Robots-Tag: noindex` from middleware.
export const pricingMetadata: Metadata = {
  title: "Pricing",
  description:
    "Learn system design, GenAI and cloud architecture for free, or go Pro for every deep-dive and interview answer.",
  alternates: { canonical: "/pricing" },
};

const FREE_FEATURES = [
  "All section overviews and hubs",
  "Selected full articles in every section",
  "Interview Practice questions (answers to selected categories)",
  "Company Questions directory",
  "Track progress on free articles",
];

const PRO_FEATURES: React.ReactNode[] = [
  <>
    <strong>Every</strong> deep-dive in GenAI &amp; LLM Systems, Classic System Design and Cloud
  </>,
  <>
    <strong>Every</strong> interview answer, with diagrams and trade-offs
  </>,
  "All company question sets",
  "Progress tracking and bookmarks across devices",
  "New articles every month",
  "Cancel any time; you keep Pro until the end of the period you've paid for",
  "7-day money-back guarantee on your first payment",
];

function FeatureList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-8 space-y-3 text-[15px] leading-relaxed text-ink-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <Check aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
          <span className="[&_strong]:font-semibold [&_strong]:text-ink">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// The "Go Pro" button. `live` (served at /pricing by middleware only when the paywall is on and the provider is
// configured, plan §9.3) links to the consent step before checkout, per billing period; otherwise payments
// haven't launched and the button says so.
function GoPro({ live }: { live: boolean }) {
  if (live) {
    const link = (plan: string, label: string, className: string) => (
      <Link
        href={`/checkout?plan=${plan}`}
        className={`${className} w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-primary`}
        data-testid={`go-pro-${plan}`}
      >
        {label}
      </Link>
    );
    return (
      <>
        {link("pro_monthly", "Go Pro monthly", "inline-flex group-data-[period=yearly]:hidden")}
        {link("pro_yearly", "Go Pro yearly", "hidden group-data-[period=yearly]:inline-flex")}
        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          Renews automatically; cancel any time. 7-day money-back guarantee on your first payment.
        </p>
      </>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled
        aria-describedby="pro-launch-note"
        className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full bg-ink/60 px-5 py-3 text-sm font-medium text-paper"
      >
        Go Pro · Launching soon
      </button>
      <p id="pro-launch-note" className="mt-3 text-center text-[13px] text-muted-foreground">
        Pro opens when payments launch. Everything free is open now.
      </p>
    </>
  );
}

// One prerendered page per checkout state × price tier; middleware serves the visitor's at /pricing
// (server/edge/pricing-variant.ts). Every variant's canonical URL is /pricing.
export async function PricingView({ live = false, tier = "A" }: { live?: boolean; tier?: PriceTier }) {
  const faq = await loadPageDoc("pricing-faq");
  const prices = pricesFor(tier);
  const regional = tier !== "A";
  const startHref = siteConfig.nav[0]?.href ?? "/";

  return (
    // Marketing copy, so not copy-protected (see features/content-protection).
    <div data-copy-ok="page" className="pb-20">
      <Container className="pt-14 sm:pt-20">
        <PageHeader
          className="mx-auto max-w-3xl text-center [&_p]:mx-auto"
          eyebrow="Pricing"
          title="Simple pricing. Learn for free, go Pro when you're ready."
          lead="Learn system design, GenAI and cloud architecture for free, or go Pro for every deep-dive and interview answer."
        />

        <div className="mt-12">
          <BillingPeriod>
            <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
              <section
                aria-labelledby="plan-free"
                className="flex flex-col rounded-2xl border border-hairline bg-paper p-8"
              >
                <Eyebrow>Free</Eyebrow>
                <h2 id="plan-free" className="mt-4 font-display text-4xl tracking-tight">
                  $0
                </h2>
                <p className="mt-2 text-[15px] text-muted-foreground">For getting started.</p>
                <FeatureList items={FREE_FEATURES} />
                <div className="mt-auto pt-10">
                  <ButtonLink href={startHref} variant="secondary" className="w-full justify-center">
                    Start learning
                  </ButtonLink>
                </div>
              </section>

              <section
                aria-labelledby="plan-pro"
                data-price-tier={tier}
                className="relative flex flex-col rounded-2xl border border-ink bg-paper p-8 shadow-[0_1px_0_0_var(--ink)]"
              >
                <Eyebrow className="text-primary">Pro</Eyebrow>
                <h2 id="plan-pro" className="mt-4 font-display text-4xl tracking-tight">
                  {prices ? (
                    <>
                      <span className="group-data-[period=yearly]:hidden">
                        {prices.monthly}
                        <span className="text-lg text-muted-foreground">/month</span>
                      </span>
                      <span className="hidden group-data-[period=yearly]:inline">
                        {prices.yearly}
                        <span className="text-lg text-muted-foreground">/year</span>
                      </span>
                    </>
                  ) : (
                    // Prices aren't set in config/business.ts yet: never show the raw TODO marker to visitors.
                    <span className="text-3xl">Price announced at launch</span>
                  )}
                </h2>
                {prices ? (
                  <p className="mt-2 text-[13px] text-muted-foreground" data-testid="price-estimate">
                    {regional
                      ? `Estimated regional price (about ${TIER_PERCENT[tier]}% of the standard price); the final price is confirmed at checkout.`
                      : "Estimated price; the final price is confirmed at checkout."}
                  </p>
                ) : (
                  regional && (
                    <p className="mt-2 text-[13px] text-muted-foreground" data-testid="price-estimate">
                      Regional pricing applies in your region.
                    </p>
                  )
                )}
                <p className="mt-2 text-[15px] text-muted-foreground">For serious interview preparation.</p>
                {prices?.sample && (
                  <p className="mt-2 text-[13px] text-muted-foreground" data-testid="sample-price">
                    Sample price for testing on this build; the real price is set in config/business.ts.
                  </p>
                )}
                <FeatureList items={PRO_FEATURES} />
                <div className="mt-auto pt-10">
                  <GoPro live={live} />
                </div>
              </section>
            </div>
          </BillingPeriod>
        </div>

        <section
          aria-label="Regional pricing"
          className="mx-auto mt-10 max-w-2xl text-center text-[15px] leading-relaxed text-muted-foreground"
        >
          <p data-testid="regional-note">
            Prices are in US dollars and are an{" "}
            <strong className="font-semibold text-ink">estimate for your region</strong>: regional pricing lowers the
            price in many countries. {business.MERCHANT_OF_RECORD}, our merchant of record, sets the final price from
            the billing country of your payment method and shows it, with any tax, at checkout before you pay. A VPN
            changes only this estimate, not the price you&apos;re charged.
          </p>
          <div className="mt-6">
            <RegionSwitcher countries={switcherCountries()} />
          </div>
        </section>
      </Container>

      <Container className="mt-20">
        <div className="mx-auto max-w-3xl border-t border-hairline pt-14">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">Questions, answered</h2>
          <div className="prose-editorial mt-10 [&_h3]:mt-10 [&_h3:first-child]:mt-0">{faq.body}</div>
        </div>

        <p className="mx-auto mt-16 max-w-3xl border-t border-hairline pt-6 text-[13px] italic leading-relaxed text-muted-foreground">
          {MOR_NOTICE} 7-day money-back guarantee.{" "}
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-ink">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ink">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/legal/refunds" className="underline underline-offset-2 hover:text-ink">
            Refunds
          </Link>
        </p>
      </Container>
    </div>
  );
}
