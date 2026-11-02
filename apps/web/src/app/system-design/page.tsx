import { HubSectionIndex } from "@/components/hub-section-index";

export const revalidate = 3600;

export default function SystemDesignIndexPage() {
  return (
    <HubSectionIndex
      section="system-design"
      label="ML System Design"
      title="ML system design"
      subtitle="Architecture notes focused on reliability, data movement, and the interfaces between research and production."
    />
  );
}
