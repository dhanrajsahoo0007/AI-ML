import { describe, expect, it } from "vitest";
import {
  carouselFigureRefs,
  carouselHtml,
  coverImageHtml,
  hashtag,
  pdfHtml,
  planSlides,
  postText,
  shareUrl,
  SLIDE,
  type KitFigure,
  type KitIssue,
} from "./slides";

const ISSUE: KitIssue = {
  slug: "harness-engineering",
  href: "/newsletter/harness-engineering",
  title: "The harness is <the> product",
  number: 1,
  hook: "Same model. Two products.",
  takeaways: ["One", "Two", "Three", "Four"],
  readingTime: 12,
  cover: { motif: "harness-ring", palette: "dusk", seed: 7 },
  body: [
    "![a](asset:diagrams/svg/newsletter/x/one)",
    "![b](asset:diagrams/svg/newsletter/x/loop#steps)",
    "![c](asset:diagrams/svg/newsletter/x/one)",
    "![d](asset:diagrams/svg/newsletter/x/ladder#step=2)",
    "![e](https://example.com/plain.png)",
  ].join("\n\n"),
};

const fig = (id: string): KitFigure => ({
  id,
  src: "data:image/png;base64,AAAA",
  width: 1080,
  height: 1500,
  line: `Line for ${id}`,
  alt: `Alt for ${id}`,
});

describe("LinkedIn kit slides", () => {
  it("takes each figure once, in body order; #steps is the whole figure, #step=n that step", () => {
    expect(carouselFigureRefs(ISSUE.body)).toEqual([
      { id: "diagrams/svg/newsletter/x/one" },
      { id: "diagrams/svg/newsletter/x/loop" },
      { id: "diagrams/svg/newsletter/x/ladder", step: 2 },
    ]);
  });

  it("plans cover, takeaways, one slide per figure, then the close", () => {
    const slides = planSlides(ISSUE, [fig("a"), fig("b")]);
    expect(slides.map((s) => s.kind)).toEqual(["cover", "takeaways", "figure", "figure", "close"]);
    expect(slides[3]).toMatchObject({ kind: "figure", number: 2 });
    expect(planSlides({ ...ISSUE, takeaways: [] }, []).map((s) => s.kind)).toEqual(["cover", "close"]);
  });

  it("renders every slide at 1080×1350 with the brand and an n / total counter, escaping text", () => {
    const slides = planSlides(ISSUE, [fig("diagrams/x/a")]);
    const html = carouselHtml({
      issue: ISSUE,
      slides,
      newsletterName: "The Letter",
      siteUrl: "https://ex.com",
      fontCss: "",
    });
    expect(html.match(/<section class="slide/g)).toHaveLength(slides.length);
    expect(html).toContain(`width:${SLIDE.width}px;height:${SLIDE.height}px`);
    for (let i = 1; i <= slides.length; i++) expect(html).toContain(`${i} / ${slides.length}`);
    expect(html.match(/The Letter/g)).toHaveLength(slides.length);
    expect(html).toContain("The harness is &lt;the&gt; product");
    expect(html).not.toContain("<the>");
    expect(html).toContain("Line for diagrams/x/a");
    expect(html).toContain("ex.com/newsletter");
    // A 1500-tall figure is scaled down to fit above its line and the footer.
    expect(html).toMatch(/<img src="data:image\/png;base64,AAAA" width="(\d+)" height="(\d+)"/);
    const [, w, h] = /width="(\d+)" height="(\d+)" alt="Alt/.exec(html)!;
    expect(Number(h)).toBeLessThan(1350 - 200);
    expect(Number(w) / Number(h)).toBeCloseTo(1080 / 1500, 2);
  });

  it("draws the cover images at their sizes", () => {
    expect(coverImageHtml(ISSUE, "og", { fontCss: "", brand: "B" })).toContain("width:1200px;height:630px");
    expect(coverImageHtml(ISSUE, "square", { fontCss: "", brand: "B" })).toContain("width:1080px;height:1080px");
    const portrait = coverImageHtml(ISSUE, "portrait", { fontCss: "", brand: "B" });
    expect(portrait).toContain("Same model. Two products.");
    expect(portrait).not.toContain(" / ");
    expect(pdfHtml(["data:a", "data:b"]).match(/<section/g)).toHaveLength(2);
  });

  it("tags the issue URL for LinkedIn and requires an absolute site URL", () => {
    const url = new URL(shareUrl("https://ex.com", ISSUE));
    expect(url.origin + url.pathname).toBe("https://ex.com/newsletter/harness-engineering");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: "linkedin",
      utm_medium: "social",
      utm_campaign: "issue-1",
    });
    expect(new URL(shareUrl("https://ex.com", { ...ISSUE, number: undefined })).searchParams.get("utm_campaign")).toBe(
      "harness-engineering"
    );
    expect(() => shareUrl("/relative", ISSUE)).toThrow();
  });

  it("writes a post with the hook, three takeaways, hashtags and the link in the first comment", () => {
    const post = postText(ISSUE, {
      url: "https://ex.com/n?x=1",
      tagLabels: ["Agents", "Harness engineering"],
      newsletterName: "L",
    });
    expect(post.startsWith("POST")).toBe(true);
    expect(post).toContain("Same model. Two products.");
    expect(post.match(/^→ /gm)).toHaveLength(3);
    expect(post).toContain("#Agents #HarnessEngineering");
    const [body, comment] = post.split("FIRST COMMENT");
    expect(body).not.toContain("https://");
    expect(comment).toContain("https://ex.com/n?x=1");
    expect(hashtag("AI & system design")).toBe("#AISystemDesign");
  });
});
