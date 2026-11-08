import { SitePage, pageMetadata } from "@/features/pages";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("legal/copyright");
}

export default function CopyrightPage() {
  return <SitePage slug="legal/copyright" crumb="Legal" />;
}
