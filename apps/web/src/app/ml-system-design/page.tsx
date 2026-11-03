import { notFound } from "next/navigation";
import { HubSectionIndex } from "@/components/hub-section-index";
import { isSectionEnabled } from "@/config/features";

export const revalidate = 3600;

// Parked for a future iteration: switch on with `mlSystemDesign` in src/config/features.ts.
export default function MlSystemDesignIndexPage() {
  if (!isSectionEnabled("ml-system-design")) notFound();
  return (
    <HubSectionIndex
      section="ml-system-design"
      label="ML System Design"
      title="ML system design"
      subtitle="Architecture notes focused on reliability, data movement, and the interfaces between research and production."
    />
  );
}
