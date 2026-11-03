import type { NextConfig } from "next";
import path from "path";
import { features } from "./src/config/features";

// Old topic-bank URLs, now category and subsection pages of the question library. Banks whose
// category is switched off (see src/config/features.ts) go to the interviews index instead.
const ml = (to: string) => (features.mlInterviews ? to : "/interviews");
const OLD_BANKS: Record<string, string> = {
  "ab-testing-and-experimentation": ml("/interviews/data-science/ab-testing"),
  "agentic-ai": "/interviews/agents",
  "ai-safety-and-security": "/interviews/safety-security",
  "behavioral-for-ml-roles": "/interviews/behavioral",
  "computer-vision": ml("/interviews/deep-learning/computer-vision"),
  "feature-engineering-and-data-prep": ml("/interviews/data-science/feature-engineering"),
  "fine-tuning-and-alignment": "/interviews/fine-tuning",
  "forward-deployed-ai": "/interviews/forward-deployed",
  "genai-and-rag": "/interviews/rag",
  "llm-evaluation": "/interviews/evaluation",
  "llm-inference-and-gpu": "/interviews/inference-gpu",
  llms: "/interviews/llm-foundations",
  "ml-system-design-interview": "/interviews/ai-system-design",
  "mlops-and-deployment": "/interviews/mlops",
  "model-evaluation-metrics": ml("/interviews/data-science/metrics"),
  "multimodal-and-voice-ai": "/interviews/multimodal",
  nlp: ml("/interviews/deep-learning/nlp"),
  "python-and-pandas": "/interviews",
  "sql-for-data-science": "/interviews",
  "statistics-and-probability": ml("/interviews/data-science/statistics"),
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
      // Learning Paths was removed; ML System Design moved to /ml-system-design/components.
      { source: "/learning-paths/:path*", destination: "/ai-system-design", permanent: true },
      { source: "/learning-paths", destination: "/ai-system-design", permanent: true },
      ...(features.mlSystemDesign
        ? [
            { source: "/system-design/ml-system-design", destination: "/ml-system-design/components", permanent: true },
            { source: "/system-design/ml-system-design/:path*", destination: "/ml-system-design/components/:path*", permanent: true },
          ]
        : [
            { source: "/system-design/ml-system-design", destination: "/ai-system-design", permanent: false },
            { source: "/system-design/ml-system-design/:path*", destination: "/ai-system-design", permanent: false },
          ]),
      ...(features.mlInterviews
        ? []
        : ["ml-fundamentals", "deep-learning", "data-science"].flatMap((c) => [
            { source: `/interviews/${c}`, destination: "/interviews", permanent: false },
            { source: `/interviews/${c}/:path*`, destination: "/interviews", permanent: false },
          ])),
    ];
  },
};

export default nextConfig;
