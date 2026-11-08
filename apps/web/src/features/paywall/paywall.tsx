import Link from "next/link";
import { Lock } from "lucide-react";
import { PaywallUnlock } from "../entitlements/islands.client";
import { PAYWALL_CONTAINER_CLASS } from "../seo/public";

// The paywall at the end of a premium page's public preview (plan §9.2). Server-rendered; the premium part of
// the page is not in this response at all. The container carries PAYWALL_CONTAINER_CLASS, the selector the
// JSON-LD paywall markup (`hasPart.cssSelector`) points at.

export function Paywall({ path, what = "article" }: { path: string; what?: string }) {
  const signIn = `/sign-in?callbackURL=${encodeURIComponent(path)}`;
  return (
    <div
      className={`${PAYWALL_CONTAINER_CLASS} relative mt-10 rounded-2xl border border-ink/15 bg-paper-2 p-6 sm:p-8`}
      data-testid="paywall"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-24 bg-gradient-to-b from-transparent to-paper"
      />
      <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-primary">
        <Lock aria-hidden className="size-4" /> Pro
      </p>
      <p className="mt-3 font-display text-2xl tracking-tight text-ink">Keep reading with Pro</p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        The rest of this {what} is part of Pro, with every deep-dive and interview answer on the site. Monthly or
        yearly, cancel any time.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href="/pricing"
          className="inline-flex items-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-primary"
        >
          See Pro plans
        </Link>
        <Link href={signIn} className="text-sm text-ink underline underline-offset-2">
          Already Pro? Sign in
        </Link>
      </div>
      <PaywallUnlock />
    </div>
  );
}
