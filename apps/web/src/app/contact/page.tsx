import { SitePage, pageMetadata } from "@/features/pages";

export const dynamic = "force-static";

export function generateMetadata() {
  return pageMetadata("contact");
}

export default function ContactPage() {
  return <SitePage slug="contact" contents={false} />;
}
