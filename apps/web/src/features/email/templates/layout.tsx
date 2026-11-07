import { Body, Container, Head, Hr, Html, Link, Preview, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { business, SITE_URL } from "../../../config/business";
import { s } from "./styles";

// Shared frame for every email: preview line, brand, body, and the footer that bulk mail needs (CAN-SPAM postal
// address, one-click unsubscribe link, privacy policy) plus the founder's address for replies. No images in the
// frame; issue images must be PNG (validated by the newsletter kind).

export interface EmailFooterProps {
  /** Unsubscribe page for this recipient (or Resend's {{{RESEND_UNSUBSCRIBE_URL}}} placeholder in broadcasts). */
  unsubscribeUrl: string;
  /** Why the recipient gets this email. */
  reason: string;
}

export const postalAddress = () =>
  [business.SELLER_LEGAL_NAME, business.SELLER_ADDRESS, business.SELLER_CITY_STATE].join(", ");

export function EmailLayout({
  preview,
  children,
  footer,
}: {
  preview: string;
  children: ReactNode;
  footer: EmailFooterProps;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Text style={s.brand}>{business.BRAND}</Text>
          {children}
          <Hr style={s.hr} />
          <Text style={s.footer}>{footer.reason}</Text>
          <Text style={s.footer}>
            <Link href={footer.unsubscribeUrl} style={s.footerLink}>
              Unsubscribe
            </Link>
            {" · "}
            <Link href={`${SITE_URL}/legal/privacy`} style={s.footerLink}>
              Privacy policy
            </Link>
          </Text>
          <Text style={s.footer}>
            Questions or feedback? Write to {business.FOUNDER_NAME} at{" "}
            <Link href={`mailto:${business.FOUNDER_EMAIL}`} style={s.footerLink}>
              {business.FOUNDER_EMAIL}
            </Link>
            .
          </Text>
          <Text style={s.footer}>{postalAddress()}</Text>
        </Container>
      </Body>
    </Html>
  );
}
