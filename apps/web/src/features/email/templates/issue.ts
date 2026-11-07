import { Heading, Hr, Link, Text } from "@react-email/components";
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
  children?: ReactNode;
}

export function IssueEmail({ title, summary, webUrl, unsubscribeUrl, children }: IssueEmailProps) {
  return h(
    EmailLayout,
    {
      preview: summary,
      footer: {
        unsubscribeUrl,
        reason: `You get this email because you subscribed to the ${business.BRAND} newsletter.`,
      },
    },
    h(Heading, { as: "h1", style: s.h1 }, title),
    children,
    h(Hr, { style: s.hr }),
    h(Text, { style: s.text }, h(Link, { href: webUrl, style: s.link }, "Read this issue on the web"))
  );
}
