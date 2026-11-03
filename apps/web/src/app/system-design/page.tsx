import { HubSectionIndex } from "@/components/hub-section-index";

export const revalidate = 3600;

export default function SystemDesignIndexPage() {
  return (
    <HubSectionIndex
      section="system-design"
      label="System Design"
      title="System design"
      subtitle="The fundamentals behind every large system, from APIs and databases to replication, plus classic interview case studies such as WhatsApp, YouTube and a URL shortener."
    />
  );
}
