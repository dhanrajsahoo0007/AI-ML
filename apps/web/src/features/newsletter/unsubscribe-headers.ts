// One-click unsubscribe headers (RFC 8058; required by Gmail and Yahoo for bulk senders, plan §15.2). The
// List-Unsubscribe URL is our POST endpoint with the subscriber's unsubscribe token: mail providers POST
// `List-Unsubscribe=One-Click` to it, with no cookies and without following redirects, and it must work without
// any further step. The message must be DKIM-signed with these headers covered (Resend signs them).

export const ONE_CLICK_BODY = "List-Unsubscribe=One-Click";

export function oneClickUnsubscribeUrl(apiUrl: string, token: string): string {
  const url = new URL(apiUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function listUnsubscribeHeaders(oneClickUrl: string): Record<string, string> {
  if (!oneClickUrl.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(oneClickUrl)) {
    throw new Error("List-Unsubscribe needs an https URL (RFC 8058 §3.1)");
  }
  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": ONE_CLICK_BODY,
  };
}

/** True when a parsed POST body (urlencoded or multipart, RFC 8058 §3.2) is a one-click request. */
export function isOneClick(form: { get(name: string): unknown }): boolean {
  return form.get("List-Unsubscribe") === "One-Click";
}
