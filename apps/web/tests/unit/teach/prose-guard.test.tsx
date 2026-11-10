import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WidgetFrame } from "@/components/teach/widgets/shared.client";

// The article's .prose-editorial rules are unlayered, so they beat every Tailwind utility (which sit in
// @layer utilities). Inside a teaching widget they broke the layout: chips after the first pushed down by
// `li + li`, a dash and padding on every `ul > li`, tables turned `display: block`, row headers restyled, the
// <pre> re-padded. WidgetFrame opts its subtree out with `not-prose`, and every descendant prose rule must skip
// that subtree.

const CSS = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const GUARD = ":where(:not(.not-prose, .not-prose *))";

/** Splits a selector list on its top-level commas (not the ones inside :not(...) or :where(...)). */
function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  return [...out, cur];
}

/** Every selector in the stylesheet that styles something inside .prose-editorial. */
function proseDescendantSelectors(css: string): string[] {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...noComments.matchAll(/(?:^|})\s*([^{}@]+?)\s*\{/g)]
    .flatMap((m) => splitSelectors(m[1]))
    .map((s) => s.trim())
    .filter((s) => s.startsWith(".prose-editorial ") && !s.startsWith(".prose-editorial >"));
}

describe("prose styles and the teaching widgets", () => {
  it("every .prose-editorial descendant rule skips a .not-prose subtree", () => {
    const selectors = proseDescendantSelectors(CSS);
    expect(selectors.length).toBeGreaterThan(20);
    for (const tag of ["ul", "li", "ol", "table", "th", "td", "pre", "code"]) {
      expect(
        selectors.some((s) => new RegExp(`\\b${tag}\\b`).test(s)),
        tag
      ).toBe(true);
    }
    const unguarded = selectors.filter((s) => !s.includes(GUARD));
    expect(unguarded, unguarded.join("\n")).toEqual([]);
  });

  it("WidgetFrame marks its root not-prose", () => {
    const html = renderToStaticMarkup(
      <WidgetFrame label="Test">
        <ul>
          <li>a</li>
          <li>b</li>
        </ul>
      </WidgetFrame>
    );
    expect(html).toMatch(/^<div class="not-prose /);
  });
});
