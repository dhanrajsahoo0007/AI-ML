import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/editorial";
import { isFreshSession, withPageSession } from "@/features/auth";
import { DeleteAccountForm, ExportDataButton } from "@/features/account/account-actions.client";

export const metadata: Metadata = { title: "Your data" };

export default async function AccountDataPage() {
  const auth = await withPageSession(async (a) => a);
  if (!auth) redirect("/sign-in?callbackURL=%2Faccount%2Fdata");
  const fresh = isFreshSession(auth.session.createdAt);

  return (
    <Container className="max-w-3xl space-y-8 py-14 sm:py-20">
      <PageHeader
        eyebrow={<Link href="/account">Account</Link>}
        title="Your data"
        lead="Download a copy of everything we store about you, or delete your account."
      />
      {!fresh && (
        <p className="rounded-xl border border-hairline bg-paper-2 p-4 text-[15px] text-ink" data-testid="reauth-note">
          For your security, exporting or deleting asks you to sign in again with Google first.
        </p>
      )}

      <section aria-labelledby="export" className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
        <h2 id="export" className="font-display text-2xl tracking-tight">
          Export your data
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          A JSON file with your profile, connected account, signed-in devices, consents, progress, bookmarks,
          subscription and payment records. Payment card details are held by our payment provider, never by us.
        </p>
        <div className="mt-5">
          <ExportDataButton />
        </div>
      </section>

      <section aria-labelledby="delete" className="rounded-2xl border border-red-700/30 bg-paper p-6 sm:p-8">
        <h2 id="delete" className="font-display text-2xl tracking-tight">
          Delete your account
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          This permanently deletes your account, progress, bookmarks and consents, and signs you out everywhere. It
          can&apos;t be undone. Payment records are kept without your name or email for accounting.
        </p>
        <div className="mt-5">
          <DeleteAccountForm />
        </div>
      </section>
    </Container>
  );
}
