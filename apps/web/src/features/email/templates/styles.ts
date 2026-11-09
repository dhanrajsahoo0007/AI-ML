import type { CSSProperties } from "react";

// Inline styles shared by the email templates. Email clients ignore stylesheets and most modern CSS, so every
// style is inline, colours are plain hex, and fonts fall back to system fonts.

const ink = "#1c1917";
const muted = "#57534e";
const hairline = "#e7e5e4";
const accent = "#b45309";

export const s = {
  body: {
    backgroundColor: "#fafaf9",
    margin: 0,
    padding: "24px 0",
    fontFamily: "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  container: {
    backgroundColor: "#ffffff",
    border: `1px solid ${hairline}`,
    borderRadius: 12,
    margin: "0 auto",
    maxWidth: 600,
    padding: "32px 32px 24px",
  },
  brand: {
    color: muted,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    margin: "0 0 24px",
  },
  h1: { color: ink, fontSize: 26, lineHeight: "1.2", fontWeight: 700, margin: "0 0 16px" },
  h2: { color: ink, fontSize: 20, lineHeight: "1.3", fontWeight: 700, margin: "28px 0 8px" },
  h3: { color: ink, fontSize: 17, lineHeight: "1.3", fontWeight: 700, margin: "24px 0 8px" },
  text: { color: ink, fontSize: 16, lineHeight: "1.6", margin: "0 0 16px" },
  link: { color: accent, textDecoration: "underline" },
  button: {
    backgroundColor: ink,
    borderRadius: 999,
    color: "#ffffff",
    display: "inline-block",
    fontSize: 15,
    fontWeight: 600,
    padding: "12px 22px",
    textDecoration: "none",
  },
  list: { color: ink, fontSize: 16, lineHeight: "1.6", margin: "0 0 16px", paddingLeft: 24 },
  code: {
    backgroundColor: "#f5f5f4",
    borderRadius: 4,
    fontFamily: "Menlo, Consolas, monospace",
    fontSize: 14,
    padding: "1px 4px",
  },
  quote: { borderLeft: `3px solid ${hairline}`, color: muted, margin: "0 0 16px", paddingLeft: 16 },
  /** Newsletter callouts (`> [!TIP]` …) and figures. */
  callout: {
    backgroundColor: "#fffbeb",
    borderLeft: `3px solid ${accent}`,
    borderRadius: 8,
    margin: "0 0 16px",
    padding: "12px 16px 1px",
  },
  calloutLabel: { color: accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", margin: "0 0 6px" },
  figure: {
    border: `1px solid ${hairline}`,
    borderRadius: 10,
    display: "block",
    height: "auto",
    maxWidth: "100%",
    margin: "8px 0 0",
  },
  /** Code blocks wrap: a long line must never widen the email past its 600 px column. */
  pre: {
    backgroundColor: "#f5f5f4",
    borderRadius: 8,
    fontFamily: "Menlo, Consolas, monospace",
    fontSize: 13,
    lineHeight: "1.5",
    margin: "0 0 16px",
    overflowWrap: "anywhere",
    padding: "12px 14px",
    whiteSpace: "pre-wrap",
  },
  /** Markdown tables in issues: full width, fixed layout so long cells wrap instead of widening the email. */
  table: { borderCollapse: "collapse", margin: "0 0 20px", tableLayout: "fixed", width: "100%" },
  th: {
    borderBottom: `2px solid ${ink}`,
    color: muted,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    padding: "6px 8px 6px 0",
    textAlign: "left",
    textTransform: "uppercase",
    verticalAlign: "bottom",
  },
  td: {
    borderBottom: `1px solid ${hairline}`,
    color: ink,
    fontSize: 14,
    lineHeight: "1.45",
    padding: "8px 8px 8px 0",
    verticalAlign: "top",
    wordBreak: "break-word",
  },
  cover: { borderRadius: 12, display: "block", height: "auto", maxWidth: "100%", margin: "0 0 20px" },
  kicker: {
    color: accent,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    margin: "0 0 6px",
    textTransform: "uppercase",
  },
  takeaways: { backgroundColor: "#f6f5f2", borderRadius: 10, margin: "4px 0 24px", padding: "14px 18px 4px" },
  takeaway: { color: ink, fontSize: 15, lineHeight: "1.55", margin: "0 0 10px" },
  figureCaption: { color: muted, fontSize: 14, lineHeight: "1.5", margin: "8px 0 20px" },
  hr: { borderColor: hairline, margin: "28px 0 20px" },
  footer: { color: muted, fontSize: 12, lineHeight: "1.6", margin: "0 0 8px" },
  footerLink: { color: muted, textDecoration: "underline" },
} satisfies Record<string, CSSProperties>;
