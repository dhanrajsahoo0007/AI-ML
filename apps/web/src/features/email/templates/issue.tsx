import { Heading, Hr, Link, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { business } from "../../../config/business";
import { EmailLayout } from "./layout";
import { s } from "./styles";

// One newsletter issue. The body is the issue's MDX compiled with the email components
// (features/newsletter/email-issue.tsx), so the web page and the email come from the same file.

export interface IssueEmailProps {
  title: string;
  summary: string;
  webUrl: string;
  unsubscribeUrl: string;
  children: ReactNode;
}

export function IssueEmail({ title, summary, webUrl, unsubscribeUrl, children }: IssueEmailProps) {
  return (
    <EmailLayout
      preview={summary}
      footer={{
        unsubscribeUrl,
        reason: `You get this email because you subscribed to the ${business.BRAND} newsletter.`,
      }}
    >
      <Heading as="h1" style={s.h1}>
        {title}
      </Heading>
      {children}
      <Hr style={s.hr} />
      <Text style={s.text}>
        <Link href={webUrl} style={s.link}>
          Read this issue on the web
        </Link>
      </Text>
    </EmailLayout>
  );
}
