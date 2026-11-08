import { SitePage, pageMetadata } from "@/features/pages";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("legal/terms");
}

export default function TermsPage() {
  return <SitePage slug="legal/terms" crumb="Legal" />;
}
