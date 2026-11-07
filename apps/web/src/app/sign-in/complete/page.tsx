import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/editorial";
import { MergeLocalProgress } from "@/features/progress/merge-local-progress.client";

// Where Google sends people back to: merges progress saved in this browser while signed out, then continues.
// Dynamic so it isn't prerendered (nothing to cache, and the crawl shouldn't follow its redirect).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Signing in", robots: { index: false, follow: false } };

export default function SignInCompletePage() {
  return (
    <Container className="max-w-xl py-14 sm:py-20">
      <PageHeader eyebrow="Account" title="Signing you in" />
      <MergeLocalProgress />
    </Container>
  );
}
