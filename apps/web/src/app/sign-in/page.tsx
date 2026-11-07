import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/editorial";
import { isGoogleConfigured, safeNextPath } from "@/features/auth";
import { SignInForm } from "@/features/auth/sign-in-form.client";

// Dynamic: whether Google is configured is read from the runtime environment. No database here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Origins AI Learn with your Google account.",
  robots: { index: false, follow: false },
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function SignInPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const next = safeNextPath(params.callbackURL);
  const reauth = params.reauth === "1";
  const failed = typeof params.error === "string";

  return (
    <Container className="max-w-xl py-14 sm:py-20">
      <PageHeader
        eyebrow="Account"
        title={reauth ? "Confirm it's you" : "Sign in"}
        lead={
          reauth
            ? "For your security, sign in again to export or delete your data."
            : "Save your progress and bookmarks across devices. Free articles stay free without an account."
        }
      />
      {failed && (
        <p role="alert" className="mt-8 rounded-xl border border-hairline bg-paper-2 p-4 text-[15px] text-ink">
          Sign-in didn&apos;t complete. Please try again.
        </p>
      )}
      <SignInForm googleEnabled={isGoogleConfigured()} next={next} />
      <p className="mt-8 text-[13px] leading-relaxed text-muted-foreground">
        We ask Google only for your name, email address and profile picture. See the{" "}
        <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ink">
          privacy policy
        </Link>
        .
      </p>
    </Container>
  );
}
