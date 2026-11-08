import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/editorial";
import { MOR_NOTICE } from "@/config/business";
import {
  CHECKOUT_CONSENTS,
  CHECKOUT_CONSENT_KEYS,
  PLANS,
  PLAN_IDS,
  checkoutConfigured,
  type Plan,
} from "@/features/billing";
import { CheckoutForm } from "@/features/billing/checkout-form.client";
import { serverEnv } from "@/server/env";

// The pre-checkout consent step (plan §9.7): terms, "access starts immediately and I lose the withdrawal right",
// and the 7-day money-back guarantee terms, each logged with its text version when the buyer continues. Dynamic (per request:
// session cookie and provider configuration), but it never reads the database: the checkout API checks the
// session and logs the consents.

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

const SESSION_COOKIE = /^(?:__Secure-)?oa\.session_token$/;

export default async function CheckoutPage({ searchParams }: { searchParams: Search }) {
  if (process.env.PAYWALL !== "on") notFound();
  const raw = (await searchParams).plan;
  const plan: Plan = PLAN_IDS.includes(raw as Plan) ? (raw as Plan) : "pro_monthly";
  const signedIn = (await cookies()).getAll().some((c) => SESSION_COOKIE.test(c.name));
  if (!signedIn) redirect(`/sign-in?callbackURL=${encodeURIComponent(`/checkout?plan=${plan}`)}`);
  const open = checkoutConfigured(serverEnv());

  return (
    <Container className="max-w-2xl py-14 sm:py-20">
      <PageHeader
        eyebrow="Checkout"
        title={`${PLANS[plan].label}`}
        lead={`Billed ${PLANS[plan].interval === "year" ? "yearly" : "monthly"} and renewed automatically until you cancel. You'll see the final price, in your currency and with tax, on the next page.`}
      />
      {open ? (
        <CheckoutForm
          plan={plan}
          consents={CHECKOUT_CONSENT_KEYS.map((key) => ({
            key,
            version: CHECKOUT_CONSENTS[key].version,
            text: CHECKOUT_CONSENTS[key].text,
          }))}
        />
      ) : (
        <p
          role="status"
          className="mt-8 rounded-xl border border-hairline bg-paper-2 p-4 text-[15px] text-ink"
          data-testid="checkout-closed"
        >
          Payments aren&apos;t open yet. Everything free is open now.
        </p>
      )}
      <p className="mt-6 text-[14px] leading-relaxed text-muted-foreground">
        Cancel any time from Account → Billing; you keep Pro until the end of the period you&apos;ve paid for. We email
        a reminder 7 days before every yearly renewal. Read the{" "}
        <Link href="/legal/terms" className="underline underline-offset-2 hover:text-ink">
          Terms
        </Link>
        ,{" "}
        <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ink">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/legal/refunds" className="underline underline-offset-2 hover:text-ink">
          Refund Policy
        </Link>
        .
      </p>
      <p className="mt-4 text-[13px] italic text-muted-foreground">{MOR_NOTICE}</p>
    </Container>
  );
}
