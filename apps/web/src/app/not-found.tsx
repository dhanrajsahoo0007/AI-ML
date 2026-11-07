import type { Metadata } from "next";
import Link from "next/link";

// The 404 page for unknown URLs and for sections that are switched off. Server-rendered, no JS of its own.
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-24 text-center md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">404</p>
      <h1 className="mt-4 text-3xl text-ink md:text-4xl">Page not found</h1>
      <p className="mt-4 text-ink-2">This page doesn&apos;t exist, or it has moved.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Go to the home page
        </Link>
        <Link
          href="/interviews"
          className="rounded-full border border-hairline px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-2"
        >
          Interview questions
        </Link>
      </div>
    </div>
  );
}
