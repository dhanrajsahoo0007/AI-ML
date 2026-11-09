import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderHtml } from "../render-html";
import { afterAll, describe, expect, it } from "vitest";
import { loadMdxFile } from "@/lib/mdx-doc";

// Keeps content/system-design/COMPONENTS.md honest: every ```mdx example in it compiles with the real MDX
// component map, passes the components' prop validation (an invalid prop renders the red InvalidProps note
// outside production) and server-renders, lazy islands included (next/dynamic is React.lazy in tests).

const DOC = path.join(process.cwd(), "content/system-design/COMPONENTS.md");
const blocks = [...fs.readFileSync(DOC, "utf8").matchAll(/^```mdx\n([\s\S]*?)^```$/gm)].map((m) => m[1]);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "components-doc-"));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

async function render(source: string, i: number) {
  const file = path.join(dir, `example-${i}.mdx`);
  fs.writeFileSync(file, `---\ntitle: Example\n---\n\n${source}`);
  return renderHtml((await loadMdxFile(file)).body);
}

describe("COMPONENTS.md examples", () => {
  it("has examples to check", () => {
    expect(blocks.length).toBeGreaterThan(20);
  });

  it.each(blocks.map((source, i) => [i, source.split("\n")[0], source] as const))(
    "example %i (%s) compiles with valid props",
    async (i, _first, source) => {
      const html = await render(source, i);
      expect(html).not.toContain("border-red-500/40");
      expect(html).not.toMatch(/unknown node ids/);
    }
  );

  it("resolves interview question company names to company tags", async () => {
    const source = blocks.find((b) => b.includes("<InterviewQuestions>"));
    expect(source).toBeDefined();
    expect(await render(source!, 999)).toContain('data-companies="meta"');
  });
});
