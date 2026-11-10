import { renderHtml } from "../../../tests/unit/render-html";
import { describe, expect, it } from "vitest";
import { compileAnswer } from "./question-answer";

// Renders a compiled answer to HTML, waiting for the lazily loaded parts (diagram renderers, KaTeX styles).
async function html(source: string, singleDollarMath = false) {
  return renderHtml(await compileAnswer(source, "test.yaml q1", { singleDollarMath }));
}

describe("compileAnswer", () => {
  it("renders plain text as a paragraph with inline code and bold", async () => {
    const out = await html("Use `SELECT` for **reads**.");
    expect(out).toMatch(/^<p>Use <code[^>]*>SELECT<\/code> for <strong[^>]*>reads<\/strong>\.<\/p>$/);
    expect(out).toContain('class="font-semibold text-ink"');
  });

  it("renders bullet and numbered lists with the list styles", async () => {
    const out = await html("- one\n- two\n\n1. first\n2. second");
    const flat = out.replace(/\n/g, "");
    expect(flat).toContain('<ul class="list-disc space-y-1 pl-5"><li>one</li><li>two</li></ul>');
    expect(flat).toContain('<ol class="list-decimal space-y-1 pl-5"><li>first</li><li>second</li></ol>');
  });

  it("renders fenced code as a scrollable pre block", async () => {
    const out = await html("```python\nprint(1)\n```");
    expect(out).toMatch(
      /<pre class="overflow-x-auto[^"]*"><code class="[^"]*language-python">print\(1\)\n<\/code><\/pre>/
    );
    expect(out).toContain("[&amp;&gt;code]:bg-transparent");
  });

  it("renders math with $$ in YAML answers and keeps single dollars as text", async () => {
    const out = await html("A GPU at $2.50/hour and $0.28 per million tokens; $$O(n^2)$$ attention.");
    expect(out).toContain("$2.50/hour and $0.28");
    expect(out).toContain('class="katex"');
  });

  it("renders $x$ as math in article answers, like the article does", async () => {
    expect(await html("Cost is $O(n)$.", true)).toContain('class="katex"');
    expect(await html("Cost is $O(n)$.", false)).not.toContain('class="katex"');
  });

  it("renders GFM tables", async () => {
    const out = await html("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(out).toContain('<div class="overflow-x-auto"><table class="w-full border-collapse text-sm">');
    expect(out).toContain("<th");
    expect(out).toContain("<td");
  });

  it("renders headings as bold lead-ins, not headings", async () => {
    const out = await html("## Why");
    expect(out).toBe('<p class="font-display font-semibold text-ink">Why</p>');
  });

  it("renders an AnimatedDiagram by asset name with its margins reset", async () => {
    const out = await html('<AnimatedDiagram name="messenger/architecture" highlight={["chat"]} />');
    expect(out).toContain('<div class="[&amp;&gt;*]:mx-0 [&amp;&gt;*]:my-3"><figure');
    expect(out).toContain("<svg");
    expect(out).toContain("Facebook Messenger high-level architecture");
  });

  it("renders a Callout inside an answer", async () => {
    const out = await html('<Callout title="Watch out">Do not cache writes.</Callout>');
    expect(out).toContain("Watch out");
    expect(out).toContain("Do not cache writes.");
  });

  it("rejects a component outside the allowed list, naming the question", async () => {
    await expect(compileAnswer("<DatabasePicker />", "rag.yaml some-id")).rejects.toThrow(
      /rag\.yaml some-id: unknown component <DatabasePicker>/
    );
  });

  it("compiles the same source once", async () => {
    const a = compileAnswer("Same text.", "x");
    const b = compileAnswer("Same text.", "y");
    expect(a).toBe(b);
    expect(compileAnswer("Same text.", "z", { singleDollarMath: true })).not.toBe(a);
  });
});
