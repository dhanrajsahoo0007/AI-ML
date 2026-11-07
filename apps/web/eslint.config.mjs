import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import boundaries from "eslint-plugin-boundaries";
import origins from "./eslint-rules/index.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// ── Architecture boundaries (plan §3, "Dependency rules") ──────────────────────────────────────────────────────
//
// | From            | May import                                                                   |
// | app/**          | features/* (public entry only), components, config, lib, server (not server/db) |
// | features/X/**   | its own files, features/Y (public entry only), server, components, lib, config |
// | components/**   | components, lib, config                                                      |
// | server/**       | server, lib, config                                                          |
// | server/edge/**  | server/edge, lib, config                                                     |
// | middleware.ts   | server/edge, lib, config                                                     |
// | config/**       | config, lib                                                                  |
// | lib/**          | lib                                                                          |
// Everything may import types/ and npm packages. Tests and test helpers are not checked.
//
// A feature's public entry points are `index.ts` (server API), `public.ts` (client-safe API, e.g. the
// inlined section nav) and `*.client.ts(x)` islands, which are imported by path so server-only tests never
// parse JSX (see features/auth/index.ts).

const FEATURE_ENTRY_POINTS = ["index.ts", "public.ts", "**/*.client.ts", "**/*.client.tsx"];

// Features that have no public entry point yet, so other code still imports their internals. Deep imports into
// these are warnings (rule `boundaries-todo/dependencies`), not errors. Add an index.ts, switch the importers to
// it, then delete the feature from this list. A new feature is not listed, so it gets an index from day one.
const FEATURES_WITHOUT_ENTRY = [
  // TODO(T1 follow-up): no stream owns these right now.
  "content-protection",
  "docs",
  "dsa",
  "observability",
  "pages",
  "sections",
  "seo",
  // TODO(S newsletter): stream S owns these.
  "email",
  "newsletter",
  // TODO(L billing): stream L is creating these; drop them here if they land with an index.ts.
  "billing",
  "entitlements",
  "paywall",
  // TODO(R admin): stream R is creating this.
  "admin",
];

// Files directly in src/ are one "root" element; `middleware` and `instrumentation` pick them out by name.
const ROOT_FILES = { middleware: "middleware.ts", instrumentation: "instrumentation.ts" };
const sourcesOf = (types) =>
  types.map((type) =>
    ROOT_FILES[type] ? { element: { type: "root", fileInternalPath: ROOT_FILES[type] } } : { element: { type } }
  );

const boundaryPolicies = [
  { allow: { to: { module: { origin: "external" } } } },
  { allow: { to: { module: { origin: "core" } } } },
  { allow: { to: { element: { type: "types" } } } },
  // A file may import anything inside its own element (app → app, features/X → features/X, lib → lib, …).
  { allow: { dependency: { relationship: { to: "internal" } } } },

  {
    from: sourcesOf(["app"]),
    allow: { to: { element: { types: ["components", "config", "lib", "server", "server-edge"] } } },
  },
  {
    from: sourcesOf(["app"]),
    disallow: { to: { element: { type: "server", fileInternalPath: "db/**" } } },
    message: "app/ must not import server/db directly; go through a feature (plan §3).",
  },
  {
    from: sourcesOf(["feature"]),
    allow: { to: { element: { types: ["components", "config", "lib", "server", "server-edge"] } } },
  },
  {
    from: sourcesOf(["instrumentation"]),
    allow: { to: { element: { types: ["config", "lib", "server", "server-edge"] } } },
  },
  // Public entry points of any feature, from app, other features and instrumentation.
  ...FEATURE_ENTRY_POINTS.map((entry) => ({
    from: sourcesOf(["app", "feature", "instrumentation"]),
    allow: { to: { element: { type: "feature", fileInternalPath: entry } } },
  })),
  // Legacy: the internals of features without an entry point (reported by boundaries-todo instead).
  ...FEATURES_WITHOUT_ENTRY.map((feature) => ({
    from: sourcesOf(["app", "feature", "instrumentation"]),
    allow: { to: { element: { type: "feature", captured: { feature } } } },
  })),

  { from: sourcesOf(["components"]), allow: { to: { element: { types: ["config", "lib"] } } } },
  { from: sourcesOf(["server"]), allow: { to: { element: { types: ["config", "lib", "server-edge"] } } } },
  { from: sourcesOf(["server-edge"]), allow: { to: { element: { types: ["config", "lib"] } } } },
  { from: sourcesOf(["middleware"]), allow: { to: { element: { types: ["config", "lib", "server-edge"] } } } },
  { from: sourcesOf(["config"]), allow: { to: { element: { type: "lib" } } } },
];

// Warnings for deep imports into FEATURES_WITHOUT_ENTRY. The last matching policy wins, so a feature's own
// files and its entry points are allowed again after the per-feature disallow.
const featureEntryTodoPolicies = [
  ...FEATURES_WITHOUT_ENTRY.map((feature) => ({
    disallow: { to: { element: { type: "feature", captured: { feature } } } },
    message: `Import features/${feature} through its public entry point (index.ts, public.ts or a *.client island); it has none yet, so add one (plan §3).`,
  })),
  { allow: { dependency: { relationship: { to: "internal" } } } },
  ...FEATURE_ENTRY_POINTS.map((entry) => ({
    allow: { to: { element: { type: "feature", fileInternalPath: entry } } },
  })),
];

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "tests/.generated/**",
      "next-env.d.ts",
      ".open-next/**",
      ".wrangler/**",
      ".build-cache/**",
      "public/_a/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },

  // ── Architecture boundaries ──
  {
    files: ["src/**/*.{ts,tsx,mts,mjs}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/**/test-helpers.ts", "src/**/test-runner.ts"],
    // Registered twice so the legacy entry-point check can run at a different severity with its own policies.
    plugins: { boundaries, "boundaries-todo": boundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true, project: "./tsconfig.json" }, node: true },
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        { type: "feature", pattern: "src/features/*", capture: ["feature"] },
        { type: "components", pattern: "src/components" },
        { type: "server-edge", pattern: "src/server/edge" },
        { type: "server", pattern: "src/server" },
        { type: "config", pattern: "src/config" },
        { type: "lib", pattern: "src/lib" },
        { type: "types", pattern: "src/types" },
        // Files directly in src/ (middleware.ts, instrumentation.ts). Element patterns match folders, so these
        // are one element told apart by file name in the policies (sourcesOf("middleware") etc.).
        { type: "root", pattern: "src" },
      ],
    },
    rules: {
      "boundaries/dependencies": ["error", { default: "disallow", policies: boundaryPolicies }],
      "boundaries-todo/dependencies": ["warn", { default: "allow", policies: featureEntryTodoPolicies }],
    },
  },
  // Known violations in existing files, reported as warnings until they're moved. Each block names its owner.
  {
    // TODO(T1 follow-up): these "lib" files are feature-level loaders (MDX component map, nav tree, question
    // bank) that import components/, config/ and features/sections. Move them into features/content and
    // features/interviews (plan §3 tree) and update AGENTS.md, which names their paths.
    files: ["src/lib/mdx-doc.tsx", "src/lib/mdx-lazy-widgets.tsx", "src/lib/nav-tree.ts", "src/lib/question-bank.ts"],
    rules: { "boundaries/dependencies": "warn" },
  },
  {
    // TODO(T1 follow-up): config/ and components/ read the section registry from features/sections. Pass the
    // data in from app/ (props, or a build-time constant like SECTION_NAV) or move the shared part to lib/.
    files: [
      "src/config/features.ts",
      "src/config/site.ts",
      "src/components/site-header.tsx",
      "src/components/hub-section-index.tsx",
      "src/components/cloud/cloud-only.tsx",
    ],
    rules: { "boundaries/dependencies": "warn" },
  },

  {
    // TODO(integration follow-up): page-level views and shared chrome added by the paywall/billing stream import
    // features (paywall, sections, seo, docs, auth). Move the views into their features (features/docs,
    // features/interviews) and pass data into the header/sidebar/profile menu from app/ (plan §3).
    files: [
      "src/components/section-doc-page.tsx",
      "src/components/interviews/**",
      "src/components/content-sidebar.tsx",
      "src/components/profile-menu.tsx",
    ],
    rules: { "boundaries/dependencies": "warn" },
  },

  // ── Project rules (eslint-rules/, tests in tests/unit/eslint-rules.test.ts) ──
  {
    files: ["src/**/*.{ts,tsx,mts,mjs}"],
    plugins: { origins },
    rules: {
      "origins/no-server-only-in-client": "error",
    },
  },
  {
    files: ["src/app/api/**/route.{ts,tsx}"],
    plugins: { origins },
    rules: {
      "origins/api-route-wrapper": [
        "error",
        {
          wrappers: [{ name: "route", from: ["@/features/auth"] }],
          handlers: [{ name: "notFoundRoute", from: ["@/server/http"] }],
          // Routes that can't use route(). Keep this list short; every entry needs a reason.
          allow: [
            {
              route: "/api/health",
              reason:
                "Deploy smoke test and uptime probe: GET only, no body, no session, no DB; served by server/edge/health.",
            },
            {
              route: "/api/vitals",
              reason:
                "navigator.sendBeacon web-vitals sink: text/plain body, no session, no DB; own size cap and zod schema, rate-limited by a Cloudflare rule (plan §10.3, §11.6).",
            },
          ],
        },
      ],
    },
  },
  {
    // TODO(S newsletter): the newsletter routes use their own guarded()/error() helpers instead of route().
    // Move them onto route() (or extend route() with what they need), then delete this block.
    files: ["src/app/api/newsletter/**/route.ts", "src/app/api/webhooks/**/route.ts"],
    rules: { "origins/api-route-wrapper": "warn" },
  },
  {
    // TODO(L billing): the billing webhook needs the raw body and has no Origin header, which route() refuses
    // today. Add a webhook mode to route() (signature check instead of Origin) or allow-list it with a reason.
    files: ["src/app/api/billing/**/route.ts", "src/app/api/entitlements/**/route.ts"],
    rules: { "origins/api-route-wrapper": "warn" },
  },
];

export default eslintConfig;
