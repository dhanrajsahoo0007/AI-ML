import { consentText, CURRENT_CONSENT_VERSION } from "./consent";
import { SignupForm } from "./signup-form.client";

// The sign-up panel shown on the archive and at the end of each issue.

const SUBSCRIBE_ENDPOINT = "/api/newsletter/subscribe";
const ACCOUNT_ENDPOINT = "/api/newsletter/account";
export const EMAIL_PREFERENCES_HREF = "/account/email-preferences";

export function SignupBox({ source, title }: { source: "archive" | "issue"; title: string }) {
  return (
    <section
      aria-labelledby={`signup-${source}`}
      className="rounded-2xl border border-hairline bg-paper-2/60 p-6 sm:p-8"
    >
      <h2 id={`signup-${source}`} className="font-display text-2xl tracking-tight text-ink">
        {title}
      </h2>
      <p className="mt-2 mb-5 text-[15px] text-muted-foreground">
        Free, no account needed. One short email per issue; unsubscribe with one click.
      </p>
      <SignupForm
        endpoint={SUBSCRIBE_ENDPOINT}
        accountEndpoint={ACCOUNT_ENDPOINT}
        preferencesHref={EMAIL_PREFERENCES_HREF}
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined}
        consentText={consentText()}
        consentVersion={CURRENT_CONSENT_VERSION}
        privacyHref="/legal/privacy"
        source={source}
      />
    </section>
  );
}
