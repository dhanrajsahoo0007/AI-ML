import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PATTERNS, USE_CASES } from "@/lib/pattern-catalog";
import { PatternUseCaseExplorer } from "./pattern-use-case-explorer";

describe("PatternUseCaseExplorer", () => {
  const html = renderToStaticMarkup(<PatternUseCaseExplorer />);

  it("renders one chip per use case", () => {
    const group = html.slice(html.indexOf('aria-label="Use cases"'));
    expect(USE_CASES).toHaveLength(13);
    for (const u of USE_CASES) expect(group).toContain(`>${u.label.replace("&", "&amp;")}</button>`);
    expect(group.match(/aria-pressed="false"/g)).toHaveLength(13);
  });

  it("shows the three tier counts computed from the catalog", () => {
    const core = PATTERNS.filter((p) => p.tier === "core").length;
    expect(html).toContain(`All patterns (${PATTERNS.length})`);
    expect(html).toContain(`Foundational (${core})`);
    expect(html).toContain(`Advanced · Interview edge (${PATTERNS.length - core})`);
  });

  it("starts with no recipe and no Clear button", () => {
    expect(html).not.toContain("pattern-recipe");
    expect(html).not.toContain(">Clear<");
  });
});
