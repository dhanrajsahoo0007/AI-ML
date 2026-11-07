import { SitePage } from "@/features/pages/site-page";
import { pageMetadata } from "@/features/pages/page-doc";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("contact");
}

export default function ContactPage() {
  return <SitePage slug="contact" contents={false} />;
}
