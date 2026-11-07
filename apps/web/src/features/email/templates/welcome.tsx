import { Heading, Link, Text } from "@react-email/components";
import { business } from "../../../config/business";
import { EmailLayout } from "./layout";
import { s } from "./styles";

// Sent once, after the subscriber confirms.

export interface WelcomeProps {
  archiveUrl: string;
  unsubscribeUrl: string;
}

export function WelcomeEmail({ archiveUrl, unsubscribeUrl }: WelcomeProps) {
  return (
    <EmailLayout
      preview={`You're subscribed to the ${business.BRAND} newsletter`}
      footer={{
        unsubscribeUrl,
        reason: `You get this email because you subscribed to the ${business.BRAND} newsletter.`,
      }}
    >
      <Heading as="h1" style={s.h1}>
        You&apos;re subscribed
      </Heading>
      <Text style={s.text}>
        Thanks for confirming. Each issue picks one theme, links three pieces from the library and ends with a question
        to take into your next design review.
      </Text>
      <Text style={s.text}>
        Past issues are in the{" "}
        <Link href={archiveUrl} style={s.link}>
          archive
        </Link>
        . You can unsubscribe at any time with the link below; it takes one click.
      </Text>
    </EmailLayout>
  );
}
