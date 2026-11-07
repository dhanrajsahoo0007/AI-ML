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
  hr: { borderColor: hairline, margin: "28px 0 20px" },
  footer: { color: muted, fontSize: 12, lineHeight: "1.6", margin: "0 0 8px" },
  footerLink: { color: muted, textDecoration: "underline" },
} satisfies Record<string, CSSProperties>;
