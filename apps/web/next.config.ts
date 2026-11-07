import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";
import { features } from "./src/config/features";
import { premiumRoutes } from "./src/features/paywall/access";
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

// Once per build (config is loaded again in build workers): write the hidden-route and premium-route manifests
// for the middleware (plan §5.1.1, §9.2) and run the content checks before any page is rendered.
function beforeBuild() {
  if (process.env.SECTIONS_PREBUILD_DONE) return;
  process.env.SECTIONS_PREBUILD_DONE = "1";
  const dir = path.join(__dirname, "src", "generated");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "hidden-routes.json"), `${JSON.stringify(hiddenRoutes(), null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "premium-routes.json"), `${JSON.stringify(premiumRoutes(), null, 2)}\n`);
  if (process.env.SKIP_CONTENT_CHECK) return;
  execFileSync(process.execPath, ["--import", "./scripts/ts-hooks.mjs", "scripts/content-check.ts"], {
    cwd: __dirname,
    stdio: "inherit",
  });
}

function readGenerated(file: string): string {
  const p = path.join(__dirname, "src", "generated", file);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function nextConfig(phase: string): NextConfig {
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
      // Registry and switch sources, inlined so request-time code never reads content/*.yaml (no fs on Workers).
      SECTIONS_YAML: fs.readFileSync(path.join(__dirname, "content", "sections.yaml"), "utf8"),
      FEATURES_YAML: fs.readFileSync(path.join(__dirname, "content", "features.yaml"), "utf8"),
      // Written by `prebuild` (scripts/gen-runtime-data.ts); "" in `next dev`, where the layout reads content directly.
      HEADER_NAV: readGenerated("header-nav.json"),
      SEARCH_INDEX: readGenerated("search-index.json"),
      // The paywall switch (content/features.yaml) this build was made with: "on" | "off" (plan §9).
      PAYWALL: features.paywall ? "on" : "off",
      // "" when unset: inlined as constants so the gated Sentry/PostHog imports are dead code and never ship
      // (plan §10; see src/features/observability/public-env.ts).
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
      NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA ?? "",
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "",
      NEXT_PUBLIC_CF_BEACON_TOKEN: process.env.NEXT_PUBLIC_CF_BEACON_TOKEN ?? "",
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
        {
          // DSA runner workers only (later rules override the same header key).
          source: "/_next/static/chunks/:file(dsa-(?:js|python)-runner.*)",
          headers: securityHeaders({
            dev: phase === PHASE_DEVELOPMENT_SERVER,
            indexable: resolveAppEnv() === "production",
            dsaRunner: true,
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

// Source maps are uploaded only in deploy builds that have a Sentry token and DSN; every other build is unchanged.
export default process.env.SENTRY_AUTH_TOKEN && process.env.NEXT_PUBLIC_SENTRY_DSN
  ? (phase: string) =>
      withSentryConfig(nextConfig(phase), {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: process.env.NEXT_PUBLIC_GIT_SHA },
        sourcemaps: { deleteSourcemapsAfterUpload: true },
        widenClientFileUpload: true,
        telemetry: false,
        silent: !process.env.CI,
      })
  : nextConfig;
