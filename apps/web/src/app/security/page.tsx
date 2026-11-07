import { SitePage } from "@/features/pages/site-page";
import { pageMetadata } from "@/features/pages/page-doc";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("security");
}

export default function SecurityPage() {
  return <SitePage slug="security" />;
}
