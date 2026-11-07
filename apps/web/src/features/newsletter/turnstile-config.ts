// Shared by the server check (turnstile.ts) and the widget (turnstile.client.ts); no imports, so the client
// bundle stays small.

/** The widget's `action`; Siteverify echoes it, and a token made for another action is refused. */
export const TURNSTILE_ACTION = "newsletter-subscribe";

/** Explicit rendering: the widget appears only once the script is loaded on first interaction with the form. */
export const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
