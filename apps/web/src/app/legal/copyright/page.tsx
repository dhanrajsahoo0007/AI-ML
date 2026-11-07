import { SitePage } from "@/features/pages/site-page";
import { pageMetadata } from "@/features/pages/page-doc";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("legal/copyright");
}

export default function CopyrightPage() {
  return <SitePage slug="legal/copyright" crumb="Legal" />;
}
