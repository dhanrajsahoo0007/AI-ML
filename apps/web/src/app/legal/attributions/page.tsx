import { SitePage, pageMetadata } from "@/features/pages";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("legal/attributions");
}

export default function AttributionsPage() {
  return <SitePage slug="legal/attributions" crumb="Legal" />;
}
