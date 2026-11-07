import type { Issue } from "../source";

// Pure rules for sending an issue (used by send-issue.tsx, run from .github/workflows/newsletter-send.yml).

export type SendMode = "test" | "broadcast";

/** Resend replaces this in broadcasts with the recipient's unsubscribe link (and adds the RFC 8058 headers). */
export const RESEND_UNSUBSCRIBE_PLACEHOLDER = "{{{RESEND_UNSUBSCRIBE_URL}}}";

/** Why an issue can't be sent in this mode, or null when it can. */
export function sendBlocker(issue: Pick<Issue, "status" | "slug">, mode: SendMode): string | null {
  if (issue.status === "sent") return `${issue.slug} is already sent (status: sent); refusing to send it twice`;
  if (mode === "broadcast" && issue.status !== "scheduled") {
    return `${issue.slug} has status ${issue.status}; set status: scheduled (with sendAt) in a reviewed PR before the real send`;
  }
  return null;
}

export const testSubject = (issue: Pick<Issue, "title">) => `[TEST] ${issue.title}`;

export function broadcastName(issue: Pick<Issue, "slug">, now = new Date()) {
  return `${issue.slug} (${now.toISOString().slice(0, 16)}Z)`;
}
