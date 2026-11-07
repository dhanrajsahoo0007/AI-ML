import { routeMetadata, routeSection } from "@/features/sections/route-helpers";
import { NEWSLETTER_KIND } from "@/features/newsletter/kind";

// The newsletter section's routes (plan §15.2). 404 when the section is off in this build (production today).

export function generateMetadata() {
  return routeMetadata(NEWSLETTER_KIND);
}

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  routeSection(NEWSLETTER_KIND);
  return <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-20 sm:px-8">{children}</div>;
}
