import { SitePage, pageMetadata } from "@/features/pages";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("legal/refunds");
}

export default function RefundsPage() {
  return <SitePage slug="legal/refunds" crumb="Legal" />;
}
