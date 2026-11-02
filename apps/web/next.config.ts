import type { NextConfig } from "next";
import path from "path";

// Old topic-bank URLs, now category and subsection pages of the question library.
const OLD_BANKS: Record<string, string> = {
  "ab-testing-and-experimentation": "/interviews/data-science/ab-testing",
  "agentic-ai": "/interviews/agents",
  "ai-safety-and-security": "/interviews/safety-security",
  "behavioral-for-ml-roles": "/interviews/behavioral",
  "computer-vision": "/interviews/deep-learning/computer-vision",
  "feature-engineering-and-data-prep": "/interviews/data-science/feature-engineering",
  "fine-tuning-and-alignment": "/interviews/fine-tuning",
  "forward-deployed-ai": "/interviews/forward-deployed",
  "genai-and-rag": "/interviews/rag",
  "llm-evaluation": "/interviews/evaluation",
  "llm-inference-and-gpu": "/interviews/inference-gpu",
  llms: "/interviews/llm-foundations",
  "ml-system-design-interview": "/interviews/ai-system-design",
  "mlops-and-deployment": "/interviews/mlops",
  "model-evaluation-metrics": "/interviews/data-science/metrics",
  "multimodal-and-voice-ai": "/interviews/multimodal",
  nlp: "/interviews/deep-learning/nlp",
  "python-and-pandas": "/interviews",
  "sql-for-data-science": "/interviews",
  "statistics-and-probability": "/interviews/data-science/statistics",
  "transformers-and-attention": "/interviews/llm-foundations/attention",
};

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async redirects() {
    return [
      ...Object.entries(OLD_BANKS).map(([slug, destination]) => ({
        source: `/interviews/${slug}`,
        destination,
        permanent: true,
      })),
      { source: "/companies/:slug", destination: "/companies?company=:slug", permanent: true },
    ];
  },
};

export default nextConfig;
