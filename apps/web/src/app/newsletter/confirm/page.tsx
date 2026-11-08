import { PageHeader } from "@/components/ui/editorial";
import { NEWSLETTER_KIND, utilityPageMetadata } from "@/features/newsletter";
import { TokenAction } from "@/features/newsletter/token-action.client";
import { routeSection } from "@/features/sections";

// Static page: the token stays in the browser until the person clicks the button.

export const dynamic = "force-static";

export function generateMetadata() {
  return utilityPageMetadata(
    routeSection(NEWSLETTER_KIND),
    "confirm",
    "Confirm your subscription",
    "Confirm your newsletter subscription."
  );
}

export default function NewsletterConfirmPage() {
  const section = routeSection(NEWSLETTER_KIND);
  return (
    <div data-copy-ok="page">
      <PageHeader
        className="mb-8"
        title="Confirm your subscription"
        lead="One click and you're on the list. You can unsubscribe at any time from any email."
      />
      <TokenAction
        endpoint="/api/newsletter/confirm"
        button="Confirm subscription"
        done="You're subscribed. A welcome email is on its way."
        missing="This page needs the link from your confirmation email. Open the email and click the button again."
        errors={{
          expired: "This link has expired (links work for 48 hours). Sign up again to get a new one.",
          not_pending: "This link is no longer valid. If you want the newsletter, sign up again.",
          default: "This link is not valid. Sign up again to get a new one.",
        }}
      />
      <p className="mt-10 text-sm text-muted-foreground">
        <a href={section.href} className="underline hover:text-ink">
          Back to the newsletter
        </a>
      </p>
    </div>
  );
}
