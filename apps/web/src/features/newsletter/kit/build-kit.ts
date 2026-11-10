// The LinkedIn share kit for one issue (plan §4). Owner-only output, never deployed:
//
//   npm run newsletter:kit -w web -- <slug>
//
// writes apps/web/.build/newsletter-kit/<slug>/:
//   carousel.pdf      the document post: cover, "In 30 seconds", one slide per figure, and a closing slide (1080×1350)
//   slides/*.png      every slide as an image (figure slides double as single-image posts for the weeks after)
//   portrait.png      1080×1350 single-image post: the cover with the title and hook
//   square.png        1080×1080 for other networks
//   og.png            1200×630, what the link preview shows
//   post.txt          a suggested post and first comment, with the UTM-tagged issue URL
//
// Needs the figures' PNGs: run `npm run assets -w web` first. Rendered with Playwright's Chromium
// (`npx playwright install chromium` once).

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";
import { SITE_URL } from "../../../config/business";
import { SITE_NAME } from "../../seo/site";
import { sectionOfKind } from "../../sections/registry";
import { NEWSLETTER_NAME } from "../brand";
import { loadCatalog, tagLabel } from "../catalog";
import { figurePng, figureSource, resolveFigure } from "../figures";
import { NEWSLETTER_KIND, newsletterKind } from "../kind";
import { loadIssues } from "../source";
import {
  carouselFigureRefs,
  carouselHtml,
  coverImageHtml,
  MAX_SLIDES,
  pdfHtml,
  planSlides,
  postText,
  shareUrl,
  SLIDE,
  type KitFigure,
  type KitIssue,
} from "./slides";

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function fontCss(): string {
  const rules = [500, 700, 800].map((weight) => {
    const rel = path.join("@fontsource", "inter", "files", `inter-latin-${weight}-normal.woff`);
    const file = [process.cwd(), path.join(process.cwd(), "..", "..")]
      .map((d) => path.join(d, "node_modules", rel))
      .find((f) => fs.existsSync(f));
    if (!file) fail(`font ${rel} not found; run npm install`);
    const data = fs.readFileSync(file).toString("base64");
    return `@font-face{font-family:Inter;font-weight:${weight};font-style:normal;src:url(data:font/woff;base64,${data}) format("woff")}`;
  });
  return rules.join("\n");
}

function kitFigure(ref: { id: string; step?: number }): KitFigure {
  const src = `asset:${ref.id}${ref.step === undefined ? "" : `#step=${ref.step}`}`;
  const fig = resolveFigure(src);
  const png = figurePng(fig);
  if (!png?.url) fail(`${src}: no PNG in the asset manifest; run npm run assets -w web`);
  const file = path.join(process.cwd(), "public", png.url);
  if (!fs.existsSync(file)) fail(`${src}: ${file} is missing; run npm run assets -w web`);
  const sidecar = figureSource(ref.id);
  const line = sidecar?.slide ?? fig.caption;
  if (!sidecar?.slide) console.warn(`warning: ${ref.id} has no "slide:" line in its sidecar; using the caption`);
  return {
    id: ref.id,
    ...(ref.step === undefined ? {} : { step: ref.step }),
    src: `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`,
    width: fig.asset.width ?? png.width ?? SLIDE.width,
    height: fig.asset.height ?? png.height ?? SLIDE.width,
    line,
    alt: fig.alt,
  };
}

async function main() {
  const { positionals } = parseArgs({ allowPositionals: true });
  const slug = positionals[0] ?? "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(`usage: npm run newsletter:kit -w web -- <issue-slug>`);

  const section = sectionOfKind(NEWSLETTER_KIND);
  const issue = loadIssues(section).find((i) => i.slug === slug) ?? fail(`no issue ${slug} in content/${section.key}/`);
  const errors = (await newsletterKind.validate(section, [issue])).filter((p) => p.level === "error");
  if (errors.length > 0)
    fail(`issue ${slug} is invalid:\n${errors.map((p) => `${p.file}:${p.line}: ${p.message}`).join("\n")}`);
  if (!issue.cover) fail(`issue ${slug} has no cover; add cover: { motif, palette, seed }`);
  const kitIssue: KitIssue = { ...issue, cover: issue.cover };

  const figures = carouselFigureRefs(issue.body).map(kitFigure);
  const slides = planSlides(kitIssue, figures);
  if (slides.length > MAX_SLIDES)
    console.warn(`warning: ${slides.length} slides; carousels past ${MAX_SLIDES} lose readers. Trim figures or split.`);
  if (/todo|example/.test(new URL(SITE_URL).host))
    console.warn(`warning: the site URL is still the placeholder ${SITE_URL}; set the domain before posting`);

  const out = path.join(process.cwd(), ".build", "newsletter-kit", slug);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "slides"), { recursive: true });

  const css = fontCss();
  const url = shareUrl(SITE_URL, issue);
  const catalog = loadCatalog(section.key);
  fs.writeFileSync(
    path.join(out, "post.txt"),
    postText(kitIssue, {
      url,
      tagLabels: issue.tags.map((t) => tagLabel(catalog, t)),
      newsletterName: NEWSLETTER_NAME,
    })
  );

  const browser = await chromium.launch();
  try {
    const html = carouselHtml({
      issue: kitIssue,
      slides,
      newsletterName: NEWSLETTER_NAME,
      siteUrl: SITE_URL,
      fontCss: css,
    });
    const names = slides.map((s, i) => {
      const name =
        s.kind === "figure" ? path.basename(s.figure.id) + (s.figure.step ? `-step-${s.figure.step}` : "") : s.kind;
      return `${String(i + 1).padStart(2, "0")}-${name}`;
    });

    // slides/*.png at LinkedIn's native 1080 px: single-image posts.
    const page = await browser.newPage({ viewport: SLIDE, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    for (let i = 0; i < slides.length; i++)
      await page
        .locator("section.slide")
        .nth(i)
        .screenshot({ path: path.join(out, "slides", `${names[i]}.png`) });

    // carousel.pdf from 2× JPEGs of the same slides: sharp on big screens, and a few MB instead of the tens of MB
    // a printed page weighs (the cover's film grain prints as huge images). LinkedIn shows each page as an image.
    const hi = await browser.newPage({ viewport: SLIDE, deviceScaleFactor: 2 });
    await hi.setContent(html, { waitUntil: "load" });
    await hi.evaluate(() => document.fonts.ready);
    const jpegs: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      const buf = await hi.locator("section.slide").nth(i).screenshot({ type: "jpeg", quality: 88 });
      jpegs.push(`data:image/jpeg;base64,${buf.toString("base64")}`);
    }
    await hi.setContent(pdfHtml(jpegs), { waitUntil: "load" });
    await hi.pdf({
      path: path.join(out, "carousel.pdf"),
      width: `${SLIDE.width}px`,
      height: `${SLIDE.height}px`,
      printBackground: true,
    });

    for (const variant of ["portrait", "square", "og"] as const) {
      const size = { portrait: SLIDE, square: { width: 1080, height: 1080 }, og: { width: 1200, height: 630 } }[
        variant
      ];
      await page.setViewportSize(size);
      await page.setContent(coverImageHtml(kitIssue, variant, { fontCss: css, brand: SITE_NAME }), {
        waitUntil: "load",
      });
      await page.evaluate(() => document.fonts.ready);
      await page
        .locator("section")
        .first()
        .screenshot({ path: path.join(out, `${variant}.png`) });
    }
  } finally {
    await browser.close();
  }

  const pdfMb = fs.statSync(path.join(out, "carousel.pdf")).size / 1e6;
  console.log(
    `LinkedIn kit for ${slug}: ${slides.length} slides, carousel.pdf ${pdfMb.toFixed(1)} MB → ${path.relative(process.cwd(), out)}/`
  );
  console.log(`  issue URL: ${url}`);
  console.log("  Before posting, paste the URL into LinkedIn Post Inspector once, so the preview is fresh.");
}

main().catch((err) => fail(err instanceof Error ? (err.stack ?? err.message) : String(err)));
