import { HubSectionIndex } from "@/components/hub-section-index";

export const revalidate = 3600;

export default function AiSystemDesignIndexPage() {
  return (
    <HubSectionIndex
      section="ai-system-design"
      label="AI System Design"
      title="AI system design"
      subtitle="Interview deep-dives on transformers, LLMs, RAG, knowledge graphs, agents and production AI systems, with architecture diagrams and practice questions."
    />
  );
}
