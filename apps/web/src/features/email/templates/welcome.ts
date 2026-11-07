import { Heading, Link, Text } from "@react-email/components";
import { createElement as h } from "react";
import { business } from "../../../config/business";
import { EmailLayout } from "./layout";
import { s } from "./styles";

// Sent once, after the subscriber confirms.

interface WelcomeProps {
  archiveUrl: string;
  unsubscribeUrl: string;
}

export function WelcomeEmail({ archiveUrl, unsubscribeUrl }: WelcomeProps) {
  return h(
    EmailLayout,
    {
      preview: `You're subscribed to the ${business.BRAND} newsletter`,
      footer: {
        unsubscribeUrl,
        reason: `You get this email because you subscribed to the ${business.BRAND} newsletter.`,
      },
    },
    h(Heading, { as: "h1", style: s.h1 }, "You're subscribed"),
    h(
      Text,
      { style: s.text },
      "Thanks for confirming. Each issue picks one theme, links three pieces from the library and ends with a question to take into your next design review."
    ),
    h(
      Text,
      { style: s.text },
      "Past issues are in the ",
      h(Link, { href: archiveUrl, style: s.link }, "archive"),
      ". You can unsubscribe at any time with the link below; it takes one click."
    )
  );
}
