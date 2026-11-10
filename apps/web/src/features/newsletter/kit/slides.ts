import { PALETTES, type Palette } from "../cover/palettes";
import { COVER_VARIANTS, renderCover } from "../cover/render";
import type { CoverSpec } from "../cover/catalog";
import { findAssetRefs } from "../links";
import type { Issue } from "../source";

// The LinkedIn share kit (plan §4), pure part: which slides the carousel has, the HTML of each slide, and the
// suggested post. No fs and no browser, so it is unit tested; kit/build-kit.ts reads the files and renders the
// HTML with Playwright.
//
// Carousel: the cover (with the hook), "In 30 seconds", one slide per figure in body order, and a closing slide.
// A build-up figure (`#steps`) shows its complete last step, which keeps the deck short; pick single steps by
// putting `#step=n` figures in the issue. Every slide is 1080×1350 (4:5), the size LinkedIn shows largest on phones.

export const SLIDE = { width: 1080, height: 1350 } as const;
/** LinkedIn carousels hold attention best at 8–12 slides; past this the script warns. */
export const MAX_SLIDES = 15;
const FOOTER_H = 92;
const LINE_H = 210;

export type KitIssue = Pick<
  Issue,
  "slug" | "href" | "title" | "number" | "hook" | "takeaways" | "readingTime" | "body"
> & {
  cover: CoverSpec;
};

/** A figure of the issue, as the kit needs it. */
export interface KitFigure {
  id: string;
  step?: number;
  /** Image source for the slide: a data: URL of the figure's light PNG. */
  src: string;
  width: number;
  height: number;
  /** The sidecar `slide` line, else its caption. */
  line: string;
  alt: string;
}

export type Slide =
  { kind: "cover" } | { kind: "takeaways" } | { kind: "figure"; figure: KitFigure; number: number } | { kind: "close" };

/** The figures to show, in body order, once each: `asset:` refs, with `#steps` as the last step. */
export function carouselFigureRefs(body: string): { id: string; step?: number }[] {
  const seen = new Set<string>();
  const out: { id: string; step?: number }[] = [];
  for (const { ref } of findAssetRefs(body)) {
    if (!ref) continue;
    const key = `${ref.id}#${ref.step ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref.step === undefined ? { id: ref.id } : { id: ref.id, step: ref.step });
  }
  return out;
}

export function planSlides(issue: KitIssue, figures: KitFigure[]): Slide[] {
  return [
    { kind: "cover" },
    ...(issue.takeaways.length > 0 ? [{ kind: "takeaways" } as const] : []),
    ...figures.map((figure, i) => ({ kind: "figure", figure, number: i + 1 }) as const),
    { kind: "close" },
  ];
}

// ── Links and the post ───────────────────────────────────────────────────────────────────────────────

/** The issue URL with LinkedIn UTM tags, so the traffic shows up per issue. Throws unless absolute. */
export function shareUrl(siteUrl: string, issue: Pick<KitIssue, "href" | "number" | "slug">): string {
  const url = new URL(issue.href, siteUrl);
  if (!/^https?:$/.test(url.protocol) || !siteUrl.startsWith(url.origin)) throw new Error(`not absolute: ${siteUrl}`);
  url.searchParams.set("utm_source", "linkedin");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", issue.number === undefined ? issue.slug : `issue-${issue.number}`);
  return url.toString();
}

/** "Harness engineering" → "#HarnessEngineering". */
export const hashtag = (label: string) =>
  `#${label
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("")}`;

/** The suggested LinkedIn post: hook, three takeaways, a pointer to the carousel, hashtags, and the first comment. */
export function postText(issue: KitIssue, opts: { url: string; tagLabels: string[]; newsletterName: string }): string {
  const lines = [
    issue.hook,
    "",
    ...issue.takeaways.slice(0, 3).map((t) => `→ ${t}`),
    "",
    "I drew the whole idea in the carousel below. The full issue, with every figure explained, is in the first comment.",
    "",
    opts.tagLabels.slice(0, 5).map(hashtag).join(" "),
  ];
  const comment = [`Full issue: ${issue.title}`, opts.url, "", `Get the next one by email: ${opts.newsletterName}`];
  return [
    "POST",
    "────",
    ...lines,
    "",
    "",
    "FIRST COMMENT (post it right after)",
    "───────────────────────────────────",
    ...comment,
    "",
  ].join("\n");
}

// ── HTML ─────────────────────────────────────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Text colours for the light slides, taken from the issue's cover palette. */
function lightTheme(p: Palette) {
  const ink = p.tone === "dark" ? p.bg[1] : p.text;
  return { ink, strong: ink, mark: p.accent, deep: p.bg[0] };
}

export interface RenderContext {
  issue: KitIssue;
  slides: Slide[];
  newsletterName: string;
  siteUrl: string;
  /** @font-face rules for Inter (data: URLs), so every machine renders the same. */
  fontCss: string;
}

function footer(ctx: RenderContext, index: number, dark: boolean) {
  const p = PALETTES[ctx.issue.cover.palette];
  const color = dark ? p.subtext : "#5b5670";
  const counter = `${index + 1} / ${ctx.slides.length}`;
  const swipe = index === 0 ? `<span class="swipe">Swipe →</span>` : "";
  return `<footer style="color:${color};border-color:${dark ? "rgba(255,255,255,.18)" : "rgba(20,16,40,.1)"}">
    <span class="brand"><i style="background:${p.accent}"></i>${esc(ctx.newsletterName)}</span>
    <span>${swipe}${counter}</span>
  </footer>`;
}

function kicker(issue: KitIssue) {
  return issue.number === undefined ? "NEWSLETTER" : `ISSUE #${issue.number}`;
}

/** The cover layout (motif on top, text below): carousel slide 1 and the standalone portrait image. */
function coverBody(issue: KitIssue, opts: { footerSpace: boolean }) {
  const p = PALETTES[issue.cover.palette];
  const bg = renderCover(issue.cover, "portrait", { grain: true, scrim: true, idPrefix: "kitcover" });
  const size = issue.title.length > 42 ? 82 : 96;
  const hook = issue.hook.length > 160 ? `${issue.hook.slice(0, 159)}…` : issue.hook;
  return `<div class="bg">${bg}</div>
  <div class="cover-text" style="padding-bottom:${opts.footerSpace ? FOOTER_H + 56 : 96}px">
    <div class="kick" style="color:${p.subtext}">${kicker(issue)} · ${issue.readingTime} MIN READ</div>
    <h1 style="color:${p.text};font-size:${size}px">${esc(issue.title)}</h1>
    <p class="hook" style="color:${p.subtext}">${esc(hook)}</p>
  </div>`;
}

function slideHtml(ctx: RenderContext, slide: Slide, index: number): string {
  const { issue } = ctx;
  const p = PALETTES[issue.cover.palette];
  const t = lightTheme(p);
  switch (slide.kind) {
    case "cover":
      return `<section class="slide dark" style="background:${p.bg[0]}">${coverBody(issue, { footerSpace: true })}${footer(ctx, index, true)}</section>`;
    case "takeaways": {
      const items = issue.takeaways
        .map((k, i) => `<li><b style="background:${t.ink}">${i + 1}</b><span>${esc(k)}</span></li>`)
        .join("");
      const size = issue.takeaways.join(" ").length > 520 ? 34 : 38;
      return `<section class="slide light">
        <div class="pad">
          <div class="kick" style="color:${t.ink}">IN 30 SECONDS</div>
          <h2 style="color:#16131f">${esc(issue.title)}</h2>
          <ol class="takeaways" style="font-size:${size}px">${items}</ol>
        </div>${footer(ctx, index, false)}</section>`;
    }
    case "figure": {
      const f = slide.figure;
      const boxH = SLIDE.height - FOOTER_H - LINE_H;
      const scale = Math.min(1, SLIDE.width / f.width, boxH / f.height);
      const w = Math.round(f.width * scale);
      const h = Math.round(f.height * scale);
      return `<section class="slide light fig">
        <div class="figbox" style="height:${boxH}px"><img src="${f.src}" width="${w}" height="${h}" alt="${esc(f.alt)}"></div>
        <div class="line" style="height:${LINE_H}px"><span class="num" style="color:${t.ink}">${String(slide.number).padStart(2, "0")}</span><p>${esc(f.line)}</p></div>
        ${footer(ctx, index, false)}</section>`;
    }
    case "close": {
      const bg = renderCover(issue.cover, "portrait", { grain: true, scrim: true, idPrefix: "kitclose" });
      const host = new URL(ctx.siteUrl).host;
      return `<section class="slide dark" style="background:${p.bg[0]}">
        <div class="bg dim">${bg}</div>
        <div class="close" style="padding-bottom:${FOOTER_H + 56}px">
          <div class="kick" style="color:${p.subtext}">THAT WAS ${kicker(issue)}</div>
          <h2 style="color:${p.text}">Read the full issue</h2>
          <p style="color:${p.subtext}">Every figure explained, with a worked example, common traps and a checklist to build your own.</p>
          <div class="cta" style="background:${p.accent};color:${p.bg[0]}">Link in the first comment</div>
          <p class="sub" style="color:${p.subtext}">Get the next issue by email: <b style="color:${p.text}">${esc(host)}/newsletter</b></p>
        </div>${footer(ctx, index, true)}</section>`;
    }
  }
}

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff}
body{font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
@page{size:${SLIDE.width}px ${SLIDE.height}px;margin:0}
.slide{position:relative;width:${SLIDE.width}px;height:${SLIDE.height}px;overflow:hidden;page-break-after:always;break-after:page}
.slide:last-child{page-break-after:auto;break-after:auto}
.slide.light{background:#fbfaf7}
.bg,.bg svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.bg.dim svg{opacity:.85}
.kick{font-size:30px;font-weight:700;letter-spacing:3px}
.cover-text{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:84px 84px 0;gap:28px}
.cover-text h1{font-weight:800;line-height:1.02;letter-spacing:-2.5px}
.cover-text .hook{font-size:38px;line-height:1.35;font-weight:500}
.pad{padding:96px 84px 0}
.pad h2{font-size:58px;line-height:1.08;letter-spacing:-1.5px;font-weight:800;margin-top:20px}
.takeaways{list-style:none;margin-top:56px;display:flex;flex-direction:column;gap:34px;color:#24202f;line-height:1.32;font-weight:500}
.takeaways li{display:flex;gap:26px;align-items:flex-start}
.takeaways b{flex:none;width:54px;height:54px;border-radius:50%;color:#fff;font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:-2px}
.figbox{display:flex;align-items:center;justify-content:center;overflow:hidden}
.figbox img{display:block}
.line{display:flex;gap:28px;align-items:center;padding:0 84px;border-top:1px solid rgba(20,16,40,.08)}
.line .num{font-size:64px;font-weight:800;letter-spacing:-2px;flex:none}
.line p{font-size:40px;line-height:1.24;font-weight:700;color:#16131f;letter-spacing:-.5px}
.close{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:84px 84px 0;gap:30px}
.close h2{font-size:100px;line-height:1;font-weight:800;letter-spacing:-3px}
.close p{font-size:38px;line-height:1.35;font-weight:500}
.close .cta{align-self:flex-start;font-size:40px;font-weight:800;padding:26px 44px;border-radius:999px;margin-top:10px}
.close .sub{font-size:30px}
footer{position:absolute;left:0;right:0;bottom:0;height:${FOOTER_H}px;display:flex;align-items:center;justify-content:space-between;padding:0 84px;border-top:1px solid;font-size:26px;font-weight:700;letter-spacing:.2px}
footer .brand{display:flex;align-items:center;gap:14px}
footer .brand i{width:16px;height:16px;border-radius:50%;display:block}
footer .swipe{margin-right:28px}
`;

function page(fontCss: string, body: string, size: { width: number; height: number } = SLIDE) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}${BASE_CSS}
  html,body{width:${size.width}px}</style></head><body>${body}</body></html>`;
}

/** Every slide in one document, one page each: printed to carousel.pdf, and screenshotted per slide. */
export function carouselHtml(ctx: RenderContext): string {
  return page(ctx.fontCss, ctx.slides.map((s, i) => slideHtml(ctx, s, i)).join("\n"));
}

/** A titled cover image without the carousel footer: the LinkedIn portrait, square and link-preview images. */
export function coverImageHtml(
  issue: KitIssue,
  variant: "portrait" | "square" | "og",
  opts: { fontCss: string; brand: string }
): string {
  const { width, height } = COVER_VARIANTS[variant];
  const p = PALETTES[issue.cover.palette];
  const bg = renderCover(issue.cover, variant, { grain: true, scrim: true, idPrefix: `kit${variant}` });
  if (variant === "portrait") {
    return page(
      opts.fontCss,
      `<section class="slide dark" style="width:${width}px;height:${height}px">${coverBody(issue, { footerSpace: false })}</section>`,
      { width, height }
    );
  }
  const og = variant === "og";
  const size = og ? (issue.title.length > 42 ? 62 : 74) : issue.title.length > 42 ? 76 : 88;
  return page(
    opts.fontCss,
    `<section class="slide" style="width:${width}px;height:${height}px">
      <div class="bg">${bg}</div>
      <div style="position:absolute;top:0;left:0;height:100%;width:${og ? "62%" : "100%"};display:flex;flex-direction:column;justify-content:${og ? "space-between" : "flex-end"};padding:${og ? "64px 72px" : "84px 84px 88px"};gap:${og ? 18 : 24}px">
        <div class="kick" style="color:${p.subtext};font-size:${og ? 24 : 28}px">${kicker(issue)}</div>
        <div style="display:flex;flex-direction:column;gap:${og ? 18 : 24}px">
          <h1 style="color:${p.text};font-size:${size}px;font-weight:800;line-height:1.02;letter-spacing:-2.5px">${esc(issue.title)}</h1>
          <div style="color:${p.subtext};font-size:${og ? 24 : 28}px;font-weight:500">${esc(opts.brand)} · ${issue.readingTime} min read</div>
        </div>
      </div>
    </section>`,
    { width, height }
  );
}

/** One full-page image per page: the carousel PDF, built from slide screenshots. */
export function pdfHtml(images: string[]): string {
  const pages = images.map(
    (src) =>
      `<section class="slide"><img src="${src}" width="${SLIDE.width}" height="${SLIDE.height}" alt=""></section>`
  );
  return page("", `<style>.slide img{display:block}</style>${pages.join("")}`);
}
