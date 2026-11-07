// Client-side error reporting for error boundaries (app/error.tsx, app/global-error.tsx). With no
// NEXT_PUBLIC_SENTRY_DSN at build time the body is dead code and no Sentry chunk is emitted.

export function captureError(error: Error & { digest?: string }): void {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import("./sentry.browser")
      .then((m) => m.captureException(error, error.digest))
      .catch(() => {
        // Reporting must never break the error page.
      });
  }
}
