// The consent text shown next to the sign-up form, versioned. The subscriber record keeps the version the person
// agreed to; once the database exists, confirming also writes a consent_log row (kind: newsletter, the version,
// the time and the source; plan §15.2 step 4). Change the text → add a new version; never edit an old one.

export const CONSENT_VERSIONS = {
  "2026-11-07":
    "By subscribing you agree to receive the newsletter by email. We send a confirmation email first, use your address only for the newsletter, and every email has a one-click unsubscribe link.",
} as const;

export type ConsentVersion = keyof typeof CONSENT_VERSIONS;

export const CURRENT_CONSENT_VERSION: ConsentVersion = "2026-11-07";

export const consentText = (version: ConsentVersion = CURRENT_CONSENT_VERSION) => CONSENT_VERSIONS[version];

export const isConsentVersion = (v: string): v is ConsentVersion => Object.hasOwn(CONSENT_VERSIONS, v);
