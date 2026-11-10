import { Heading, Hr, Img, Link, Section, Text } from "@react-email/components";
import { createElement as h, type ReactNode } from "react";
import { business } from "../../../config/business";
import { EmailLayout } from "./layout";
import { s } from "./styles";

// One newsletter issue. The body is the issue's MDX compiled with the email components
// (features/newsletter/email-issue.ts), so the web page and the email come from the same file.

interface IssueEmailProps {
  title: string;
  summary: string;
  webUrl: string;
  unsubscribeUrl: string;
  /** Absolute URL of the cover's email PNG, shown above the title. */
  coverUrl?: string;
  /** Small line above the title, e.g. "Issue #1 · 9 min read". */
  kicker?: string;
  /** "In 30 seconds" bullets, shown before the body. */
  takeaways?: string[];
  children?: ReactNode;
}

export function IssueEmail({
  title,
  summary,
  webUrl,
  unsubscribeUrl,
  coverUrl,
  kicker,
  takeaways = [],
  children,
}: IssueEmailProps) {
  return h(
    EmailLayout,
    {
      preview: summary,
      footer: {
        unsubscribeUrl,
        reason: `You get this email because you subscribed to the ${business.BRAND} newsletter.`,
      },
    },
    coverUrl ? h(Link, { href: webUrl }, h(Img, { src: coverUrl, alt: "", width: 536, style: s.cover })) : null,
    kicker ? h(Text, { style: s.kicker }, kicker) : null,
    h(Heading, { as: "h1", style: s.h1 }, title),
    takeaways.length
      ? h(
          Section,
          { style: s.takeaways },
          h(Text, { style: s.calloutLabel }, "IN 30 SECONDS"),
          ...takeaways.map((t) => h(Text, { key: t, style: s.takeaway }, `• ${t}`))
        )
      : null,
    children,
    h(Hr, { style: s.hr }),
    h(Text, { style: s.text }, h(Link, { href: webUrl, style: s.link }, "Read this issue on the web"))
  );
}
