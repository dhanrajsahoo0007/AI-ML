// The consent text shown next to the sign-up form, versioned. The version the person agreed to travels in the
// signed confirm token; confirming writes a consent_log row (kind newsletter_opt_in, the version, the time;
// plan §15.2 step 4), and so does a signed-in one-click subscribe. Unsubscribing writes a withdrawal row
// (store.ts WITHDRAWN_VERSION). Change the text → add a new version; never edit an old one.

const CONSENT_VERSIONS = {
  "2026-11-07":
    "By subscribing you agree to receive the newsletter by email. We send a confirmation email first, use your address only for the newsletter, and every email has a one-click unsubscribe link.",
} as const;

type ConsentVersion = keyof typeof CONSENT_VERSIONS;

export const CURRENT_CONSENT_VERSION: ConsentVersion = "2026-11-07";

/** The version every confirm token issued before tokens carried one was made for. Never change it. */
export const FIRST_CONSENT_VERSION: ConsentVersion = "2026-11-07";

export const consentText = (version: ConsentVersion = CURRENT_CONSENT_VERSION) => CONSENT_VERSIONS[version];

export const isConsentVersion = (v: string): v is ConsentVersion => Object.hasOwn(CONSENT_VERSIONS, v);
