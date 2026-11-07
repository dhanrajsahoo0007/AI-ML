import { SitePage } from "@/features/pages/site-page";
import { pageMetadata } from "@/features/pages/page-doc";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("legal/terms");
}

export default function TermsPage() {
  return <SitePage slug="legal/terms" crumb="Legal" />;
}
