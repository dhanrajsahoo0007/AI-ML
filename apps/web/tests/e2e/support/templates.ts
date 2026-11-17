// The key page templates that the visual, accessibility and Lighthouse checks cover (plan §6, §12.1). One URL
// per template; pick pages that exist in every environment profile (sections that are `on` in production).

export interface TemplatePage {
  name: string;
  url: string;
  /** The page has diagrams, Mermaid or <AnimatedDiagram> (the visual check also snapshots the first one). */
  diagram?: boolean;
}

export const TEMPLATE_PAGES: TemplatePage[] = [
  { name: "home", url: "/" },
  { name: "hub", url: "/system-design" },
  // A diagram-heavy article. Its last Mermaid diagram became an <AnimatedDiagram> on 2026-11-17, so the
  // diagram snapshot is now of its first <AnimatedDiagram>.
  { name: "article-diagrams", url: "/ai-system-design/genai-system-design/prompt-engineering-types", diagram: true },
  { name: "interview-subsection", url: "/interviews/rag/rag-fundamentals" },
  { name: "pricing", url: "/pricing" },
  { name: "legal", url: "/legal/terms" },
];
