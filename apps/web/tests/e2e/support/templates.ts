// The key page templates that the visual, accessibility and Lighthouse checks cover (plan §6, §12.1). One URL
// per template; pick pages that exist in every environment profile (sections that are `on` in production).

export interface TemplatePage {
  name: string;
  url: string;
  /** The page has build-time Mermaid diagrams (the visual check also snapshots the first one). */
  diagram?: boolean;
}

export const TEMPLATE_PAGES: TemplatePage[] = [
  { name: "home", url: "/" },
  { name: "hub", url: "/system-design" },
  // A Mermaid-heavy article (three build-time diagrams). The Transformer pages moved to <AnimatedDiagram> specs.
  { name: "article-diagrams", url: "/ai-system-design/genai-system-design/prompt-engineering-types", diagram: true },
  { name: "interview-subsection", url: "/interviews/rag/rag-fundamentals" },
  { name: "pricing", url: "/pricing" },
  { name: "legal", url: "/legal/terms" },
];
