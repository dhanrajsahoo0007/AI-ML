import { ImageResponse } from "next/og";
import { OG_HEIGHT, OG_WIDTH } from "./metadata";
import { SITE_NAME } from "./site";

// Open Graph card shared by app/opengraph-image.tsx and the per-section image routes. Rendered once at build
// (the routes are static), with the font bundled in next/og: no font files are fetched.

export const OG_SIZE = { width: OG_WIDTH, height: OG_HEIGHT };
export const OG_CONTENT_TYPE = "image/png";

// Light theme colours from globals.css (--paper, --ink, --navy).
const PAPER = "#faf9f6";
const INK = "#111111";
const NAVY = "#1e3a8a";

export function ogImage({ title, subtitle }: { title: string; subtitle?: string }) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: PAPER,
        color: INK,
        borderTop: `16px solid ${NAVY}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: NAVY, letterSpacing: -0.5 }}>
        {SITE_NAME}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 40 ? 64 : 80,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -2,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, color: "#4a4a4a", maxWidth: 980 }}>
            {subtitle.length > 150 ? `${subtitle.slice(0, 149)}…` : subtitle}
          </div>
        )}
      </div>
    </div>,
    OG_SIZE
  );
}
