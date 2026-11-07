import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/editorial";
import { withPageSession } from "@/features/auth";
import { business } from "@/config/business";
import { GRACE_PERIOD_DAYS, GUARANTEE_DAYS, PLANS, billingOverview, formatMoney } from "@/features/billing";
import { CheckoutReturn } from "@/features/billing/billing-status.client";

// Account → Billing (plan §9.3): plan, the price in the currency paid, the renewal or end date, a manage button
// (the provider's portal: payment method, invoices, cancel), recent payments, and the on-hold banner during the
// 7-day grace period. Dynamic and per user, like the rest of /account (never cached or indexed).

export const metadata: Metadata = { title: "Billing" };

type Search = Promise<Record<string, string | string[] | undefined>>;

// The portal is an API redirect to the provider: a plain GET form, so the client router never prefetches it.
function PortalButton({ children, className, testId }: { children: React.ReactNode; className: string; testId?: string }) {
  return (
    <form action="/api/billing/portal" method="get" className="inline">
      <button type="submit" className={className} data-testid={testId}>
        {children}
      </button>
    </form>
  );
}

const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const PAYMENT_LABELS: Record<string, string> = {
  succeeded: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partly refunded",
  disputed: "Disputed",
  dispute_won: "Dispute closed",
  dispute_lost: "Charged back",
};

export default async function BillingPage({ searchParams }: { searchParams: Search }) {
  const success = (await searchParams).status === "success";
  const data = await withPageSession(async (auth, db) => billingOverview(db, auth.user.id));
  if (!data) redirect("/sign-in?callbackURL=%2Faccount%2Fbilling");
  const { subscription: sub, tier, validUntil, payments, guarantee } = data;
  // The refund itself is issued by the owner at the merchant of record; this only starts the request.
  const refundHref = `mailto:${business.BILLING_EMAIL}?subject=${encodeURIComponent("Refund request (7-day money-back guarantee)")}`;
  const pro = tier === "pro";
  const live = sub && (sub.status === "active" || sub.status === "on_hold");

  return (
    <Container className="max-w-3xl space-y-8 py-14 sm:py-20">
      <PageHeader eyebrow="Account" title="Billing" />
      {success && <CheckoutReturn alreadyPro={pro} />}

      {sub?.status === "on_hold" && (
        <div role="alert" data-testid="on-hold-banner" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-[15px] text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">Your last payment didn&apos;t go through.</p>
          <p className="mt-1">
            Pro stays on for a {GRACE_PERIOD_DAYS}-day grace period
            {validUntil ? <>, until {date(validUntil)}</> : null}. Update your payment method to keep it.
          </p>
          <div className="mt-3">
            <PortalButton className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper">
              Update payment method
            </PortalButton>
          </div>
        </div>
      )}

      <section aria-label="Plan" className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-tight">Plan</h2>
        <dl className="mt-5 grid gap-4 text-[15px] sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Current plan</dt>
            <dd className="mt-1 text-ink" data-testid="billing-plan">
              {pro && sub ? PLANS[sub.plan].label : pro ? "Pro" : "Free"}
            </dd>
          </div>
          {sub && live && (
            <div>
              <dt className="text-muted-foreground">Price</dt>
              <dd className="mt-1 text-ink" data-testid="billing-price">
                {formatMoney(sub.amountMinor, sub.currency)} / {PLANS[sub.plan].interval} (plus any tax)
              </dd>
            </div>
          )}
          {sub && live && sub.currentPeriodEnd && (
            <div>
              <dt className="text-muted-foreground">{sub.cancelAtPeriodEnd ? "Pro ends on" : "Renews on"}</dt>
              <dd className="mt-1 text-ink" data-testid="billing-renewal">
                {date(sub.currentPeriodEnd)}
              </dd>
            </div>
          )}
          {pro && !live && validUntil && (
            <div>
              <dt className="text-muted-foreground">Pro until</dt>
              <dd className="mt-1 text-ink">{date(validUntil)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {sub ? (
            <PortalButton
              className="inline-flex rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-primary"
              testId="billing-manage"
            >
              Manage subscription
            </PortalButton>
          ) : (
            <Link href="/pricing" className="inline-flex rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-primary">
              See Pro plans
            </Link>
          )}
          {sub && (
            <PortalButton className="text-sm text-ink underline underline-offset-2">Invoices and receipts</PortalButton>
          )}
        </div>
        {guarantee.eligible && (
          <p className="mt-5 text-[15px] text-ink" data-testid="refund-request">
            Not what you expected? Your {guarantee.kind === "yearly_renewal" ? "yearly renewal" : "first payment"} is
            covered by our {GUARANTEE_DAYS}-day money-back guarantee until {date(guarantee.until)}.{" "}
            <a href={refundHref} className="underline underline-offset-2">
              Request a refund
            </a>
            . Pro ends when the refund is issued.
          </p>
        )}
        <p className="mt-4 text-[13px] text-muted-foreground">
          Payment method, invoices and cancellation are handled by our reseller, Dodo Payments. Cancelling stops
          future renewals; you keep Pro until the end of the period you&apos;ve paid for. 7-day money-back guarantee
          on your first payment (
          <Link href="/legal/refunds" className="underline underline-offset-2">
            refund policy
          </Link>
          ).
        </p>
      </section>

      {payments.length > 0 && (
        <section aria-label="Payments" className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
          <h2 className="font-display text-2xl tracking-tight">Payments</h2>
          <ul className="mt-4 divide-y divide-hairline" data-testid="billing-payments">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-[15px]">
                <span className="text-ink">{date(p.createdAt)}</span>
                <span className="text-muted-foreground">
                  {formatMoney(p.amountMinor, p.currency)} · {PAYMENT_LABELS[p.status] ?? p.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[15px]">
        <Link href="/account" className="underline underline-offset-2">
          Back to your account
        </Link>
      </p>
    </Container>
  );
}
