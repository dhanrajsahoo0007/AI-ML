import { SitePage } from "@/features/pages/site-page";
import { pageMetadata } from "@/features/pages/page-doc";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("legal/attributions");
}

export default function AttributionsPage() {
  return <SitePage slug="legal/attributions" crumb="Legal" />;
}
