import { Body, Container, Head, Hr, Html, Link, Preview, Text } from "@react-email/components";
import { createElement as h, type ReactNode } from "react";
import { business, SITE_URL } from "../../../config/business";
import { s } from "./styles";

// Shared frame for every email: preview line, brand, body, and the footer that bulk mail needs (CAN-SPAM postal
// address, one-click unsubscribe link, privacy policy) plus the founder's address for replies. No images in the
// frame; issue images must be PNG (validated by the newsletter kind).
//
// Templates use createElement rather than JSX: the app compiles JSX through Next, but the unit tests (Vite, with
// the app's `jsx: preserve`) and the send script (tsx, plain Node) load these files directly.

interface EmailFooterProps {
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
  children?: ReactNode;
  footer: EmailFooterProps;
}) {
  return h(
    Html,
    { lang: "en" },
    h(Head),
    h(Preview, null, preview),
    h(
      Body,
      { style: s.body },
      h(
        Container,
        { style: s.container },
        h(Text, { style: s.brand }, business.BRAND),
        children,
        h(Hr, { style: s.hr }),
        h(Text, { style: s.footer }, footer.reason),
        h(
          Text,
          { style: s.footer },
          h(Link, { href: footer.unsubscribeUrl, style: s.footerLink }, "Unsubscribe"),
          " · ",
          h(Link, { href: `${SITE_URL}/legal/privacy`, style: s.footerLink }, "Privacy policy")
        ),
        h(
          Text,
          { style: s.footer },
          `Questions or feedback? Write to ${business.FOUNDER_NAME} at `,
          h(Link, { href: `mailto:${business.FOUNDER_EMAIL}`, style: s.footerLink }, business.FOUNDER_EMAIL),
          "."
        ),
        h(Text, { style: s.footer }, postalAddress())
      )
    )
  );
}
