import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { bodyStats, readingMinutes } from "./body-stats";
import { CALLOUT_ATTR, remarkCallouts } from "./callouts";
import { figureProblems } from "./figures";
import { findAssetRefs, findCallouts, isFigureOnly, parseAssetSrc } from "./links";
import { FORMATS, issueFrontmatterSchema } from "./schema";

// The issue content model (plan §1): asset: figures, callouts, body stats and the frontmatter rules.

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "newsletter-figures-"));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

function asset(id: string, ext: string, content: string, sidecar?: string) {
  const file = path.join(tmp, `${id}.${ext}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (sidecar !== undefined) fs.writeFileSync(path.join(tmp, `${id}.meta.yaml`), sidecar);
}

asset(
  "diagrams/svg/nl/hero",
  "svg",
  "<svg viewBox='0 0 10 10'/>",
  "alt: A core in a ring\ncaption: The ring is the harness\n"
);
asset(
  "diagrams/svg/nl/loop",
  "svg",
  "<svg viewBox='0 0 10 10'><g data-step='1'/><g data-step='2'/></svg>",
  "alt: A loop\ncaption: Each turn is checked\n"
);
asset("diagrams/svg/nl/bare", "svg", "<svg viewBox='0 0 10 10'/>", "");
asset("diagrams/svg/nl/locked", "svg", "<svg/>", "alt: x\ncaption: y\naccess: premium\n");

describe("asset: figure sources", () => {
  it("parses ids and steps; rejects malformed ones", () => {
    expect(parseAssetSrc("asset:diagrams/svg/nl/loop#step=2")).toEqual({ id: "diagrams/svg/nl/loop", step: 2 });
    expect(parseAssetSrc("asset:diagrams/svg/nl/hero")).toEqual({ id: "diagrams/svg/nl/hero" });
    expect(parseAssetSrc("asset:Bad Id")).toBeNull();
    expect(parseAssetSrc("asset:x#step=0")).toBeNull();
    expect(parseAssetSrc("https://x/y.png")).toBeNull();
  });

  it("finds figures outside fenced code only, with lines", () => {
    const body = "Text\n\n![a](asset:diagrams/svg/nl/hero)\n\n```md\n![b](asset:diagrams/svg/nl/loop)\n```\n";
    expect(findAssetRefs(body).map((r) => [r.ref?.id, r.line])).toEqual([["diagrams/svg/nl/hero", 3]]);
  });

  it("accepts good figures and explains every problem", () => {
    expect(figureProblems("asset:diagrams/svg/nl/hero", tmp)).toEqual([]);
    expect(figureProblems("asset:diagrams/svg/nl/loop#step=2", tmp)).toEqual([]);
    expect(figureProblems("asset:diagrams/svg/nl/missing", tmp).join()).toMatch(/no asset diagrams\/svg\/nl\/missing/);
    expect(figureProblems("asset:diagrams/svg/nl/bare", tmp).join("\n")).toMatch(/needs alt[\s\S]*needs a caption/);
    expect(figureProblems("asset:diagrams/svg/nl/locked", tmp).join()).toMatch(/premium/);
    expect(figureProblems("asset:diagrams/svg/nl/loop", tmp).join()).toMatch(/build-up figure; pick a step/);
    expect(figureProblems("asset:diagrams/svg/nl/loop#step=3", tmp).join()).toMatch(/step 3 is not one of 1, 2/);
    expect(figureProblems("asset:diagrams/svg/nl/hero#step=1", tmp).join()).toMatch(/no data-step layers/);
    expect(figureProblems("asset:BAD", tmp).join()).toMatch(/malformed/);
  });

  it("knows when a paragraph holds only a figure", () => {
    expect(isFigureOnly({ props: { src: "asset:diagrams/svg/nl/hero" } })).toBe(true);
    expect(isFigureOnly([{ props: { src: "asset:x" } }, " text"])).toBe(false);
    expect(isFigureOnly("text")).toBe(false);
  });
});

describe("callouts", () => {
  it("finds alert markers", () => {
    expect(findCallouts("> [!TIP]\n> Do it.\n\n> plain\n\n> [!DANGER]\n> x")).toEqual([
      { type: "TIP", line: 1 },
      { type: "DANGER", line: 6 },
    ]);
  });

  it("the remark plugin strips the marker and tags the blockquote", () => {
    const quote = {
      type: "blockquote",
      children: [{ type: "paragraph", children: [{ type: "text", value: "[!WARNING]\nDon't dump it all in." }] }],
    };
    const plain = {
      type: "blockquote",
      children: [{ type: "paragraph", children: [{ type: "text", value: "[!NOPE] stays" }] }],
    };
    remarkCallouts()({ type: "root", children: [quote, plain] });
    expect(quote).toMatchObject({
      data: { hProperties: { [CALLOUT_ATTR]: "WARNING" } },
      children: [{ children: [{ value: "Don't dump it all in." }] }],
    });
    expect(plain).not.toHaveProperty("data");
  });
});

describe("body stats", () => {
  const body = [
    "## Why this matters",
    "One two three four five. Six seven eight.",
    "",
    "![x](asset:diagrams/svg/nl/hero)",
    "",
    "## How it works: the loop",
    "> [!TIP]",
    "> Nine ten.",
    "",
    "```ts",
    "const notASentence = 1",
    "```",
  ].join("\n");

  it("counts words, figures, headings and sentence length", () => {
    const s = bodyStats(body);
    expect(s.headings).toEqual(["Why this matters", "How it works: the loop"]);
    expect(s.figures).toBe(1);
    expect(s.words).toBeGreaterThan(10);
    expect(s.avgSentenceWords).toBeGreaterThan(2);
  });

  it("counts the steps of one build-up figure once", () => {
    const steps = "![a](asset:diagrams/svg/nl/loop#step=1)\n\n![b](asset:diagrams/svg/nl/loop#step=2)\n";
    expect(bodyStats(steps)).toMatchObject({ figures: 1, images: 2 });
  });

  it("measures the longest run of words without a visual", () => {
    const long = `${"word ".repeat(400)}\n\n![x](asset:diagrams/svg/nl/hero)\n\n${"word ".repeat(50)}`;
    expect(bodyStats(long).longestPlainRun).toEqual({ words: 400, line: 1 });
  });

  it("reading time counts words and figures, at least a minute", () => {
    expect(readingMinutes({ words: 10, images: 0 })).toBe(1);
    expect(readingMinutes({ words: 2300, images: 10 })).toBe(12);
  });
});

describe("frontmatter", () => {
  const base = { title: "T", date: "2026-11-16", summary: "S" };

  it("defaults to a deep dive with empty lists", () => {
    const fm = issueFrontmatterSchema.parse({ ...base, status: "draft" });
    expect(fm).toMatchObject({ format: "deep-dive", tags: [], takeaways: [], related: [], access: "free" });
  });

  it("needs a number and a cover once it is scheduled", () => {
    const r = issueFrontmatterSchema.safeParse({ ...base, status: "scheduled", sendAt: "2999-01-01T09:00:00Z" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path.join("."))).toEqual(["issue", "cover"]);
  });

  it("rejects unknown cover motifs and palettes", () => {
    const r = issueFrontmatterSchema.safeParse({
      ...base,
      status: "draft",
      cover: { motif: "unicorn", palette: "dusk", seed: 1 },
    });
    expect(r.success).toBe(false);
  });

  it("every format has sane rules", () => {
    for (const rules of Object.values(FORMATS)) {
      expect(rules.takeaways[0]).toBeLessThanOrEqual(rules.takeaways[1]);
      expect(rules.maxWords).toBeGreaterThan(0);
    }
  });
});
