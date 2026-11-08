import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/editorial";
import { withPageSession } from "@/features/auth";
import { consentText } from "@/features/newsletter/consent";
import { EmailPreferences } from "@/features/newsletter/email-preferences.client";
import { newsletterHref, newsletterStore } from "@/features/newsletter/server";
import { accountStatus } from "@/features/newsletter/service";

// /account/email-preferences (plan §15.2): a signed-in user's newsletter status, with one-click subscribe (no
// double opt-in: Google verified the address) and unsubscribe. A 404 while the newsletter section is not `on`.
// Dynamic and per-user like every account page (app/account/layout.tsx).

export const metadata: Metadata = { title: "Email preferences" };

export default async function EmailPreferencesPage() {
  const href = newsletterHref();
  if (!href) notFound();
  const data = await withPageSession(async (auth, db) =>
    accountStatus(
      newsletterStore(() => db),
      auth.user
    )
  );
  if (!data) redirect("/sign-in?callbackURL=%2Faccount%2Femail-preferences");

  return (
    <Container className="max-w-3xl space-y-8 py-14 sm:py-20">
      <PageHeader
        eyebrow={<Link href="/account">Account</Link>}
        title="Email preferences"
        lead="Choose which emails we send you. Service emails about your account or subscription are always sent."
      />
      <section aria-labelledby="newsletter-prefs" className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
        <h2 id="newsletter-prefs" className="font-display text-2xl tracking-tight">
          <Link href={href} className="hover:text-primary">
            Newsletter
          </Link>
        </h2>
        <div className="mt-5">
          <EmailPreferences
            endpoint="/api/newsletter/account"
            email={data.email}
            initialStatus={data.status}
            contactHref="/contact"
          />
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          {consentText()}{" "}
          <Link href="/legal/privacy" className="underline hover:text-ink">
            Privacy policy
          </Link>
          .
        </p>
      </section>
    </Container>
  );
}
