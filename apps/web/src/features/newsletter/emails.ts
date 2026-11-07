import { createElement as h } from "react";
import { business } from "../../config/business";
import { renderEmail } from "../email/render";
import type { EmailMessage } from "../email/sender";
import { ConfirmSubscriptionEmail } from "../email/templates/confirm-subscription";
import { WelcomeEmail } from "../email/templates/welcome";
import { CONFIRM_TTL_LABEL } from "./token";
import { listUnsubscribeHeaders } from "./unsubscribe-headers";

// The newsletter's transactional emails, built from the shared templates in features/email/templates.

/** Bulk mail goes out from its own subdomain (plan §15.2): news.<domain>, with SPF, DKIM and DMARC. */
export const NEWSLETTER_FROM = `${business.BRAND} <news@news.${business.DOMAIN}>`;
export const NEWSLETTER_REPLY_TO = business.FOUNDER_EMAIL;

export interface SubscriberLinks {
  /** The confirm page with the confirm token. */
  confirmUrl: string;
  /** The unsubscribe page with the unsubscribe token (footer link). */
  unsubscribeUrl: string;
  /** The RFC 8058 one-click POST endpoint with the unsubscribe token (List-Unsubscribe header). */
  oneClickUrl: string;
  archiveUrl: string;
}

export async function confirmationEmail(to: string, links: SubscriberLinks): Promise<EmailMessage> {
  const { html, text } = await renderEmail(
    h(ConfirmSubscriptionEmail, {
      confirmUrl: links.confirmUrl,
      unsubscribeUrl: links.unsubscribeUrl,
      validFor: CONFIRM_TTL_LABEL,
    })
  );
  return {
    to,
    from: NEWSLETTER_FROM,
    replyTo: NEWSLETTER_REPLY_TO,
    subject: `Confirm your subscription to the ${business.BRAND} newsletter`,
    html,
    text,
    template: "confirm-subscription",
  };
}

export async function welcomeEmail(to: string, links: SubscriberLinks): Promise<EmailMessage> {
  const { html, text } = await renderEmail(
    h(WelcomeEmail, { archiveUrl: links.archiveUrl, unsubscribeUrl: links.unsubscribeUrl })
  );
  return {
    to,
    from: NEWSLETTER_FROM,
    replyTo: NEWSLETTER_REPLY_TO,
    subject: `You're subscribed to the ${business.BRAND} newsletter`,
    html,
    text,
    headers: listUnsubscribeHeaders(links.oneClickUrl),
    template: "welcome",
  };
}
