import { SitePage } from "@/features/pages/site-page";
import { pageMetadata } from "@/features/pages/page-doc";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("legal/privacy");
}

export default function PrivacyPage() {
  return <SitePage slug="legal/privacy" crumb="Legal" />;
}
