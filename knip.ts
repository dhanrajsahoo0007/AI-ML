import type { KnipConfig } from "knip";

// Knip finds unused files, dependencies and exports. Run with `npm run knip`; CI fails on findings.
const config: KnipConfig = {
  // Let knip see `@import "pkg"` in CSS (tailwindcss, tw-animate-css, shadcn/tailwind.css).
  compilers: {
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join("\n"),
  },
  workspaces: {
    ".": {},
    "apps/web": {
      entry: ["scripts/**/*.ts", "tests/**/*.ts"],
      project: ["src/**/*.{ts,tsx,css}", "scripts/**/*.ts", "tests/**/*.ts"],
      ignoreDependencies: [
        // Loaded by name through FlatCompat (`next/core-web-vitals`), which knip can't follow.
        "eslint-config-next",
        // Peer of @tailwindcss/postcss; Next.js ships its own copy.
        "postcss",
        // Its font files are read by path (cover/social-card.tsx, kit/build-kit.ts), not imported.
        "@fontsource/inter",
      ],
    },
  },
  // TEMPORARY (wave 1): unused exports live in files that streams B, C and D are editing. Reported as warnings
  // so they stay visible; switch back to errors once wave 1 is merged and they are cleaned up.
  rules: {
    exports: "warn",
    types: "warn",
  },
};

export default config;
