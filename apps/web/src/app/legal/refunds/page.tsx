import { SitePage } from "@/features/pages/site-page";
import { pageMetadata } from "@/features/pages/page-doc";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("legal/refunds");
}

export default function RefundsPage() {
  return <SitePage slug="legal/refunds" crumb="Legal" />;
}
