import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { createElement as h } from "react";
import { business } from "../../../config/business";
import { EmailLayout } from "./layout";
import { s } from "./styles";

// Double opt-in (plan §15.2 step 3): the subscriber is `pending` until they open this link.

export interface ConfirmSubscriptionProps {
  confirmUrl: string;
  unsubscribeUrl: string;
  /** How long the link works, e.g. "48 hours". */
  validFor: string;
}

export function ConfirmSubscriptionEmail({ confirmUrl, unsubscribeUrl, validFor }: ConfirmSubscriptionProps) {
  return h(
    EmailLayout,
    {
      preview: `Confirm your subscription to the ${business.BRAND} newsletter`,
      footer: {
        unsubscribeUrl,
        reason: `You get this email because someone entered this address on the ${business.BRAND} newsletter form. If it wasn't you, ignore it and you won't hear from us again.`,
      },
    },
    h(Heading, { as: "h1", style: s.h1 }, "Confirm your subscription"),
    h(
      Text,
      { style: s.text },
      `Please confirm that you want the ${business.BRAND} newsletter: one short digest of system design and AI engineering at a time, with links to the full articles.`
    ),
    h(
      Section,
      { style: { margin: "8px 0 24px" } },
      h(Button, { href: confirmUrl, style: s.button }, "Confirm subscription")
    ),
    h(
      Text,
      { style: s.text },
      `The link works for ${validFor}. If the button doesn't work, open this address: `,
      h(Link, { href: confirmUrl, style: s.link }, confirmUrl)
    )
  );
}
