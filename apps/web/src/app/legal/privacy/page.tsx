import { SitePage, pageMetadata } from "@/features/pages";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("legal/privacy");
}

export default function PrivacyPage() {
  return <SitePage slug="legal/privacy" crumb="Legal" />;
}
