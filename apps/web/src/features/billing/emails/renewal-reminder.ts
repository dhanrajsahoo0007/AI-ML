import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Text } from "@react-email/components";
import { createElement as h } from "react";
import { business, SITE_URL } from "../../../config/business";
import { renderEmail } from "../../email/render";
import type { EmailMessage } from "../../email/sender";
import { s } from "../../email/templates/styles";

// The annual renewal reminder (plan §9.7: US auto-renewal laws), sent 7 days before every yearly renewal.
// Transactional: no unsubscribe link, but the way to cancel is one click away.

export interface RenewalReminderProps {
  name: string;
  renewsOn: string;
  price: string;
  manageUrl: string;
}

/** The message for one reminder (built by the email queue consumer, or inline without a queue). */
export async function renewalReminderEmail(to: string, props: RenewalReminderProps): Promise<EmailMessage> {
  const { html, text } = await renderEmail(RenewalReminderEmail(props));
  return {
    to,
    from: `${business.BRAND} <${business.BILLING_EMAIL}>`,
    subject: `Your ${business.BRAND} Pro plan renews on ${props.renewsOn}`,
    html,
    text,
    template: "renewal-reminder",
  };
}

function RenewalReminderEmail({ name, renewsOn, price, manageUrl }: RenewalReminderProps) {
  return h(
    Html,
    { lang: "en" },
    h(Head),
    h(Preview, null, `Your ${business.BRAND} Pro plan renews on ${renewsOn}`),
    h(
      Body,
      { style: s.body },
      h(
        Container,
        { style: s.container },
        h(Text, { style: s.brand }, business.BRAND),
        h(Heading, { as: "h1", style: s.h1 }, "Your yearly Pro plan renews soon"),
        h(Text, { style: s.text }, `Hi ${name},`),
        h(
          Text,
          { style: s.text },
          `Your ${business.BRAND} Pro plan renews automatically on ${renewsOn} for ${price} (plus any tax shown at checkout).`
        ),
        h(
          Text,
          { style: s.text },
          "Nothing to do if you want to keep Pro. To stop the renewal, cancel before that date from ",
          h(Link, { href: manageUrl, style: s.link }, "Account → Billing"),
          ". You keep Pro until the end of the period you've paid for. If the renewal goes through and you didn't want it, you can ask for a refund within 7 days of the charge."
        ),
        h(Hr, { style: s.hr }),
        h(
          Text,
          { style: s.footer },
          `You get this email because you have a yearly ${business.BRAND} Pro subscription. Questions? Write to `,
          h(Link, { href: `mailto:${business.BILLING_EMAIL}`, style: s.footerLink }, business.BILLING_EMAIL),
          ". ",
          h(Link, { href: `${SITE_URL}/legal/refunds`, style: s.footerLink }, "Refund and cancellation policy")
        )
      )
    )
  );
}
