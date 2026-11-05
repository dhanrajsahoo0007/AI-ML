import { notFound } from "next/navigation";
import { HubSectionIndex } from "@/components/hub-section-index";
import { isSectionEnabled } from "@/config/features";

export const revalidate = 3600;

// Behind the `cloud` flag in src/config/features.ts until the pilot pages are approved.
export default function CloudIndexPage() {
  if (!isSectionEnabled("cloud")) notFound();
  return (
    <HubSectionIndex
      section="cloud"
      label="Cloud Architecture"
      title="Cloud architecture"
      subtitle="AWS, Google Cloud and Azure services grouped by job: what each one is, when to use it, and the matching service on the other two clouds."
    />
  );
}
