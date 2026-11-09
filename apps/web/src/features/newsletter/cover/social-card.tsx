import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "../../seo/public";
import type { Issue } from "../source";
import { PALETTES } from "./palettes";
import { COVER_VARIANTS, renderCover, type CoverVariant } from "./render";

// PNG renditions of an issue's cover (plan §2): the link preview (og), the email header, and the LinkedIn
// portrait and square images. Drawn with next/og at build time: the generated cover is the background, and
// the text uses next/og's bundled font, so no font files are fetched and every machine renders the same.

export const NEWSLETTER_LABEL = "Newsletter";

export const PNG_VARIANTS = ["og", "email", "portrait", "square"] as const satisfies readonly CoverVariant[];
export type PngVariant = (typeof PNG_VARIANTS)[number];

type CardIssue = Pick<Issue, "title" | "number" | "hook" | "readingTime"> & {
  cover: NonNullable<Issue["cover"]>;
};

// Inter (the site font) at three weights, read from @fontsource/inter at build time: the cards render once during
// the build, so nothing is fetched at request time. A bold headline stands out in a LinkedIn feed.
// The package is hoisted to the repo root in the workspace; look in the app first, then upwards.
function fontFile(weight: number) {
  const rel = path.join("@fontsource", "inter", "files", `inter-latin-${weight}-normal.woff`);
  for (const dir of [process.cwd(), path.join(process.cwd(), "..", "..")]) {
    const file = path.join(dir, "node_modules", rel);
    if (fs.existsSync(file)) return fs.readFileSync(file);
  }
  throw new Error(`font ${rel} not found; run npm install`);
}
let fonts: { name: string; data: Buffer; weight: 500 | 700 | 800; style: "normal" }[] | null = null;
function interFonts() {
  fonts ??= ([500, 700, 800] as const).map((weight) => ({
    name: "Inter",
    data: fontFile(weight),
    weight,
    style: "normal",
  }));
  return fonts;
}

const dataUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

function kicker(issue: CardIssue) {
  return issue.number === undefined ? NEWSLETTER_LABEL.toUpperCase() : `ISSUE #${issue.number}`;
}

export function coverPng(issue: CardIssue, variant: PngVariant): ImageResponse {
  const { width, height } = COVER_VARIANTS[variant];
  const p = PALETTES[issue.cover.palette];
  const titled = variant !== "email";
  const background = renderCover(issue.cover, variant, { grain: true, scrim: titled });
  const text = { color: p.text, display: "flex" } as const;
  const sub = { color: p.subtext, display: "flex" } as const;

  if (!titled) {
    // eslint-disable-next-line @next/next/no-img-element -- next/og draws <img>, not next/image
    return new ImageResponse(<img src={dataUrl(background)} width={width} height={height} alt="" />, {
      width,
      height,
      fonts: interFonts(),
    });
  }

  const og = variant === "og";
  const titleSize = og ? (issue.title.length > 42 ? 62 : 74) : issue.title.length > 42 ? 82 : 96;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Inter" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws <img>, not next/image */}
      <img src={dataUrl(background)} width={width} height={height} alt="" style={{ position: "absolute" }} />
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          justifyContent: og ? "space-between" : "flex-end",
          left: 0,
          top: 0,
          width: og ? "62%" : "100%",
          height: "100%",
          padding: og ? "64px 72px" : "84px 84px 96px",
        }}
      >
        {og && <div style={{ ...sub, fontSize: 24, fontWeight: 700, letterSpacing: 3 }}>{kicker(issue)}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: og ? 18 : 28 }}>
          {!og && <div style={{ ...sub, fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>{kicker(issue)}</div>}
          <div style={{ ...text, fontSize: titleSize, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2.5 }}>
            {issue.title}
          </div>
          {variant === "portrait" && (
            <div style={{ ...sub, fontSize: 36, lineHeight: 1.35 }}>
              {issue.hook.length > 160 ? `${issue.hook.slice(0, 159)}…` : issue.hook}
            </div>
          )}
          <div style={{ ...sub, fontSize: og ? 24 : 28, marginTop: og ? 6 : 18 }}>
            {SITE_NAME} · {NEWSLETTER_LABEL} · {issue.readingTime} min read
          </div>
        </div>
      </div>
    </div>,
    { width, height, fonts: interFonts() }
  );
}
