import type { CoverPalette } from "./catalog";

// Cover palettes (plan §2). Each is a whole mood: a two-stop background, a glow, two accents for the motif's focus,
// a line colour for structure, and the text colours used when a cover carries a title (OG, LinkedIn). Covers are
// art, so they keep their palette in dark mode too; only the page around them changes.

export interface Palette {
  name: CoverPalette;
  /** Whether the background is dark (light text on it) or light (dark text). */
  tone: "dark" | "light";
  /** Background gradient, from one corner to the other. */
  bg: readonly [string, string];
  /** Soft blobs of light behind the motif. */
  glow: string;
  /** The focus: the core, the highlighted path. */
  accent: string;
  /** A second accent, for highlights inside the focus. */
  accent2: string;
  /** Structure lines and small nodes. */
  line: string;
  /** Fill of quiet shapes (planes, node centres). */
  soft: string;
  /** Title text on this cover. */
  text: string;
  /** Secondary text (kicker, hook, brand). */
  subtext: string;
}

export const PALETTES: Record<CoverPalette, Palette> = {
  dusk: {
    name: "dusk",
    tone: "dark",
    bg: ["#15122e", "#3a2668"],
    glow: "#7b5cff",
    accent: "#ff8a5c",
    accent2: "#ffd38a",
    line: "#efe7ff",
    soft: "#2a2150",
    text: "#fbf8ff",
    subtext: "#cfc4f2",
  },
  sage: {
    name: "sage",
    tone: "light",
    bg: ["#eef2e8", "#c9d8bf"],
    glow: "#ffffff",
    accent: "#2f6b4f",
    accent2: "#e3a24f",
    line: "#1f3328",
    soft: "#f7f9f3",
    text: "#13231a",
    subtext: "#3f5a49",
  },
  coral: {
    name: "coral",
    tone: "light",
    bg: ["#ffe7dc", "#ffb39a"],
    glow: "#fff4ee",
    accent: "#c2412d",
    accent2: "#2b2f6b",
    line: "#3a1a14",
    soft: "#fff3ed",
    text: "#2a120d",
    subtext: "#6e3527",
  },
  sand: {
    name: "sand",
    tone: "light",
    bg: ["#f6efe1", "#e6cfa3"],
    glow: "#fffaf0",
    accent: "#b5542f",
    accent2: "#2f4858",
    line: "#2b2117",
    soft: "#fbf6ec",
    text: "#21180f",
    subtext: "#5f4a33",
  },
  ink: {
    name: "ink",
    tone: "dark",
    bg: ["#0b0e14", "#1b2636"],
    glow: "#2dd4bf",
    accent: "#5eead4",
    accent2: "#c4b5fd",
    line: "#dfe8f1",
    soft: "#172131",
    text: "#f3f7fb",
    subtext: "#a9b8c9",
  },
  lagoon: {
    name: "lagoon",
    tone: "light",
    bg: ["#e2f5f4", "#93d3d6"],
    glow: "#ffffff",
    accent: "#0b5873",
    accent2: "#f08a4b",
    line: "#0d2a33",
    soft: "#f1fbfb",
    text: "#08222b",
    subtext: "#2c5361",
  },
};

// ── Contrast (WCAG 2) ────────────────────────────────────────────────────────────────────────────

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
