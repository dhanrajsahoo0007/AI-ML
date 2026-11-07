"use client";

import { useEffect } from "react";
import { captureError } from "@/features/observability/capture";

// Last-resort boundary, for errors in the root layout itself. It replaces the whole document, so the site's
// stylesheet, header and theme may be missing: plain inline styles that work in light and dark.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ font: "16px/1.6 system-ui, sans-serif", colorScheme: "light dark", textAlign: "center" }}>
        <main role="alert" style={{ maxWidth: "36rem", margin: "20vh auto", padding: "0 1rem" }}>
          <h1>Something went wrong</h1>
          <p>Origins AI Learn didn&apos;t load properly. Please try again in a moment.</p>
          <p>
            <button type="button" onClick={reset}>
              Try again
            </button>{" "}
            {/* A full page load, not a client navigation: the app may be in a broken state. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Go to the home page</a>
          </p>
          {error.digest && <p>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
