"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureError } from "@/features/observability/capture";

// Error boundary for every page below the root layout (the header and footer stay). Reports to Sentry when it is
// switched on; the message never shows the error itself, which could hold internals. Its chunk loads on every
// page, so it stays small: no icons, no extra imports.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto w-full max-w-2xl px-4 py-24 text-center md:px-8">
      <h1 className="text-3xl text-ink md:text-4xl">Something went wrong</h1>
      <p className="mt-4 text-ink-2">
        This page didn&apos;t load properly. Please try again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-hairline px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-2"
        >
          Go to the home page
        </Link>
      </div>
      {error.digest && <p className="mt-8 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
    </div>
  );
}
