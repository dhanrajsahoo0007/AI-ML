import { SitePage, pageMetadata } from "@/features/pages";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("security");
}

export default function SecurityPage() {
  return <SitePage slug="security" />;
}
