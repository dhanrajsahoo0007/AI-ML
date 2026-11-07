import { PageHeader } from "@/components/ui/editorial";
import { NEWSLETTER_KIND } from "@/features/newsletter/kind";
import { utilityPageMetadata } from "@/features/newsletter/seo";
import { TokenAction } from "@/features/newsletter/token-action.client";
import { routeSection } from "@/features/sections/route-helpers";

// Static page behind the footer "Unsubscribe" link. Mail apps' own unsubscribe buttons skip it and POST to the
// one-click endpoint directly (RFC 8058).

export const dynamic = "force-static";

export function generateMetadata() {
  return utilityPageMetadata(
    routeSection(NEWSLETTER_KIND),
    "unsubscribe",
    "Unsubscribe",
    "Stop receiving the newsletter."
  );
}

export default function NewsletterUnsubscribePage() {
  const section = routeSection(NEWSLETTER_KIND);
  return (
    <div data-copy-ok="page">
      <PageHeader
        className="mb-8"
        title="Unsubscribe"
        lead="Stop receiving the newsletter. No account or password needed."
      />
      <TokenAction
        endpoint="/api/newsletter/unsubscribe"
        button="Unsubscribe"
        done="You're unsubscribed and won't get any more issues. Changed your mind? You can sign up again any time."
        missing="This page needs the unsubscribe link from one of our emails. Open the email and click Unsubscribe again."
        errors={{ default: "This link is not valid. Use the unsubscribe link from your most recent email." }}
      />
      <p className="mt-10 text-sm text-muted-foreground">
        <a href={section.href} className="underline hover:text-ink">
          Back to the newsletter
        </a>
      </p>
    </div>
  );
}
