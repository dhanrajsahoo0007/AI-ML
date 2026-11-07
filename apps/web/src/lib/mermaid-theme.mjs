// Mermaid theme shared by the build-time renderer (scripts/render-mermaid.mjs) and the dev-only client
// fallback (components/mdx/mermaid.tsx), so diagrams look the same either way. Plain JS so the Node
// script can import it without a TypeScript loader.

/** Bump when the config or post-processing changes, so every cached diagram is re-rendered. */
export const THEME_VERSION = "3";

export const PALETTES = {
  light: {
    accent: { fill: "#1e3a8a", text: "#faf9f6" },
    vars: {
      background: "#faf9f6",
      primaryColor: "#faf9f6",
      primaryTextColor: "#111111",
      primaryBorderColor: "#bdb9b0",
      secondaryColor: "#e8ecf6",
      tertiaryColor: "#f2f0eb",
      lineColor: "#8a8780",
      textColor: "#2b2b2b",
      clusterBkg: "#f2f0eb",
      clusterBorder: "#dcd9d2",
      edgeLabelBackground: "#faf9f6",
      actorBkg: "#faf9f6",
      actorBorder: "#bdb9b0",
      signalColor: "#6b6b6b",
      noteBkgColor: "#e8ecf6",
      noteBorderColor: "#1e3a8a",
    },
  },
  dark: {
    accent: { fill: "#93b1f5", text: "#141413" },
    vars: {
      background: "#141413",
      primaryColor: "#1d1c1a",
      primaryTextColor: "#f2f0eb",
      primaryBorderColor: "#4a4843",
      secondaryColor: "#1b2440",
      tertiaryColor: "#1d1c1a",
      lineColor: "#8a8780",
      textColor: "#d4d1ca",
      clusterBkg: "#1a1918",
      clusterBorder: "#3a3935",
      edgeLabelBackground: "#141413",
      actorBkg: "#1d1c1a",
      actorBorder: "#4a4843",
      signalColor: "#b5b2ab",
      noteBkgColor: "#1b2440",
      noteBorderColor: "#93b1f5",
    },
  },
};

/** The font stack written into each SVG; `--font-inter` comes from next/font in the root layout. */
export const FONT_FAMILY = "var(--font-inter), ui-sans-serif, system-ui, sans-serif";

/** @param {"light" | "dark"} mode */
export function mermaidConfig(mode) {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    fontFamily: FONT_FAMILY,
    themeVariables: { fontSize: "14px", darkMode: mode === "dark", ...PALETTES[mode].vars },
    flowchart: { curve: "basis", padding: 14, nodeSpacing: 36, rankSpacing: 48 },
    sequence: { mirrorActors: false, actorMargin: 40 },
  };
}

/**
 * The diagram source as rendered: trimmed, and flowcharts get the shared `:::accent` class.
 * @param {string} chart
 * @param {"light" | "dark"} mode
 */
export function prepareSource(chart, mode) {
  const trimmed = chart.trim();
  if (!/^(flowchart|graph)\b/.test(trimmed)) return trimmed;
  const { fill, text } = PALETTES[mode].accent;
  return `${trimmed}\nclassDef accent fill:${fill},stroke:${fill},color:${text},font-weight:500`;
}
