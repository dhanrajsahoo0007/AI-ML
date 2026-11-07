import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";
import { features } from "./src/config/features";
import { allSections, hiddenRoutes, publicNavLinks, resolveAppEnv } from "./src/features/sections/registry";
import { securityHeaders } from "./src/features/seo/security-headers";

// Old topic-bank URLs, now category and subsection pages of the question library. Banks whose
// category is switched off (content/features.yaml) go to the interviews index instead.
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

// Redirects declared by sections in content/sections.yaml: to `to` while the section is on, else to
// `fallback` (temporary, so turning the section on later is not blocked by cached permanent redirects).
function sectionRedirects() {
  return allSections().flatMap((s) =>
    (s.redirects ?? []).flatMap((r) => {
      const destination = s.state === "on" ? r.to : r.fallback;
      return destination ? [{ source: r.from, destination, permanent: s.state === "on" }] : [];
    })
  );
}

// Once per build (config is loaded again in build workers): write the hidden-route manifest for the
// middleware (plan §5.1.1) and run the content checks before any page is rendered.
function beforeBuild() {
  if (process.env.SECTIONS_PREBUILD_DONE) return;
  process.env.SECTIONS_PREBUILD_DONE = "1";
  const dir = path.join(__dirname, "src", "generated");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "hidden-routes.json"), `${JSON.stringify(hiddenRoutes(), null, 2)}\n`);
  if (process.env.SKIP_CONTENT_CHECK) return;
  // Cloud's practice questions are not filed in articles.yaml yet: reported, but not blocking.
  execFileSync(
    process.execPath,
    ["--import", "./scripts/ts-hooks.mjs", "scripts/content-check.ts", "--warn-cloud-questions"],
    { cwd: __dirname, stdio: "inherit" }
  );
}

export default function nextConfig(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) beforeBuild();
  return {
    output: "standalone",
    poweredByHeader: false,
    outputFileTracingRoot: path.join(__dirname, "../.."),
    // Resolved once at build: the environment the section states were built for, and the `on`
    // sections' header links (client components read these; hidden and off sections never ship).
    env: {
      APP_ENV: resolveAppEnv(),
      SECTION_NAV: JSON.stringify(publicNavLinks()),
    },
    // Security headers on every response (plan §11.4). /_next/static/* already gets
    // `public, max-age=31536000, immutable` from Next itself, so no Cache-Control rule is added for it.
    async headers() {
      return [
        {
          source: "/:path*",
          headers: securityHeaders({
            dev: phase === PHASE_DEVELOPMENT_SERVER,
            indexable: resolveAppEnv() === "production",
          }),
        },
      ];
    },
    async redirects() {
      return [
        ...Object.entries(OLD_BANKS).map(([slug, destination]) => ({
          source: `/interviews/${slug}`,
          destination,
          permanent: true,
        })),
        { source: "/companies/:slug", destination: "/companies?company=:slug", permanent: true },
        // Learning Paths was removed.
        { source: "/learning-paths/:path*", destination: "/ai-system-design", permanent: true },
        { source: "/learning-paths", destination: "/ai-system-design", permanent: true },
        ...sectionRedirects(),
        ...(features.mlInterviews
          ? []
          : ["ml-fundamentals", "deep-learning", "data-science"].flatMap((c) => [
              { source: `/interviews/${c}`, destination: "/interviews", permanent: false },
              { source: `/interviews/${c}/:path*`, destination: "/interviews", permanent: false },
            ])),
      ];
    },
  };
}
