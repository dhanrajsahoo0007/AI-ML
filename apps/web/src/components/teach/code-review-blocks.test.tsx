import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildTree, fileTreeSchema, treeProblem } from "./file-tree-model";
import { FileTree } from "./file-tree";
import { commentProblem, fenceOf, parseDiff } from "./diff-model";
import { Diff } from "./diff";
import { AiReply, Prompt, PromptExchange, exchangeParts } from "./prompt-exchange";

// <FileTree>, <PromptExchange> and <Diff>: the AI-assisted coding scenario blocks. Bad props render the dev-only
// InvalidProps note (border-red-500/40) under Vitest, which is what these cases look for.
const INVALID = "border-red-500/40";

describe("FileTree", () => {
  const items = [
    { path: "README.md", note: "The brief" },
    { path: "engine/parser.py", note: "Turns rule text into tokens", tag: "edit" as const },
    { path: "tests/test_part1.py", tag: "test" as const },
    { path: "engine/rules.py", tag: "bug" as const },
    { path: "engine/io/load.py" },
  ];

  it("puts folders first in first-seen order, then files in the order given", () => {
    const tree = buildTree(items);
    expect(tree.map((n) => n.name)).toEqual(["engine", "tests", "README.md"]);
    const engine = tree[0];
    expect(engine.kind === "folder" && engine.children.map((n) => n.name)).toEqual(["io", "parser.py", "rules.py"]);
  });

  it("rejects duplicates, a file used as a folder, bad paths and more than 40 items", () => {
    expect(treeProblem(["a.py", "a.py"])).toMatch(/duplicate/);
    expect(treeProblem(["pkg", "pkg/x.py"])).toMatch(/listed as a file/);
    expect(fileTreeSchema.safeParse({ items: [{ path: "/abs.py" }] }).success).toBe(false);
    expect(fileTreeSchema.safeParse({ items: [{ path: "../up.py" }] }).success).toBe(false);
    expect(fileTreeSchema.safeParse({ items: [{ path: "x.py", tag: "fix" }] }).success).toBe(false);
    expect(fileTreeSchema.safeParse({ items: [] }).success).toBe(false);
    const many = Array.from({ length: 41 }, (_, i) => ({ path: `f${i}.py` }));
    expect(fileTreeSchema.safeParse({ items: many }).success).toBe(false);
  });

  it("renders the root, monospace names, tag badges and notes, scrolling inside itself", () => {
    const html = renderToStaticMarkup(<FileTree root="rule_engine/" items={items} />);
    expect(html).toContain("rule_engine/");
    expect(html).toContain("engine/");
    expect(html).toContain('data-path="engine/parser.py"');
    expect(html).toContain(">edit<");
    expect(html).toContain("Turns rule text into tokens");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("font-mono");
    expect(html).not.toContain(INVALID);
  });

  it("reports bad props instead of rendering", () => {
    expect(renderToStaticMarkup(<FileTree items={[{ path: "a//b.py" }]} />)).toContain(INVALID);
  });
});

const fence = (text: string, lang = "diff") => (
  <pre>
    <code className={`language-${lang}`}>{text}</code>
  </pre>
);
const HUNK_TEXT = " def run(self):\n-    for job in self.queue:\n+    for batch in chunks(self.queue, 50):\n+        self.send(batch)\n     return True\n";

describe("Diff", () => {
  it("finds the one fence and numbers lines from the hunk header", () => {
    expect(fenceOf(fence("x"))).toEqual({ lang: "diff", text: "x" });
    expect(fenceOf(<p>no fence</p>)).toBeNull();
    expect(fenceOf([fence("a"), fence("b")])).toBeNull();
    const lines = parseDiff(HUNK_TEXT, "@@ -40,3 +40,4 @@");
    expect(lines.map((l) => l.kind)).toEqual(["context", "del", "add", "add", "context"]);
    expect(lines.map((l) => [l.oldNo, l.newNo])).toEqual([
      [40, 40],
      [41, undefined],
      [undefined, 41],
      [undefined, 42],
      [42, 43],
    ]);
    expect(parseDiff("@@ -1 +1 @@\n+x")[0].kind).toBe("meta");
  });

  it("checks that every comment sits on a line of the fence", () => {
    expect(commentProblem(5, [{ line: 5, severity: "nit", text: "ok" }])).toBeNull();
    expect(commentProblem(5, [{ line: 6, severity: "nit", text: "off the end" }])).toMatch(/line 6/);
  });

  it("renders a +/- gutter, screen-reader labels and each comment under its line", () => {
    const html = renderToStaticMarkup(
      <Diff
        file="batcher/processor.py"
        hunk="@@ -40,3 +40,4 @@"
        comments={[{ line: 3, severity: "blocker", text: "A failed batch is dropped, not retried." }]}
      >
        {fence(HUNK_TEXT)}
      </Diff>
    );
    expect(html).toContain("batcher/processor.py");
    expect(html).toContain('data-kind="add"');
    expect(html).toContain('data-kind="del"');
    expect(html).toContain("Added: ");
    expect(html).toContain("Removed: ");
    expect(html).toContain("Blocker:");
    const added = html.indexOf("for batch in chunks");
    const comment = html.indexOf("A failed batch is dropped");
    const nextLine = html.indexOf("self.send(batch)");
    expect(added).toBeLessThan(comment);
    expect(comment).toBeLessThan(nextLine);
    expect(html).toContain("overflow-x-auto");
    expect(html).not.toContain(INVALID);
  });

  it("reports a missing or non-diff fence, an out-of-range comment and more than 8 comments", () => {
    expect(renderToStaticMarkup(<Diff file="a.py">{fence("x", "python")}</Diff>)).toContain(INVALID);
    expect(renderToStaticMarkup(<Diff file="a.py">plain text</Diff>)).toContain(INVALID);
    expect(
      renderToStaticMarkup(
        <Diff file="a.py" comments={[{ line: 9, severity: "nit", text: "x" }]}>
          {fence(HUNK_TEXT)}
        </Diff>
      )
    ).toContain(INVALID);
    const nine = Array.from({ length: 9 }, () => ({ line: 1, severity: "nit" as const, text: "x" }));
    expect(
      renderToStaticMarkup(
        <Diff file="a.py" comments={nine}>
          {fence(HUNK_TEXT)}
        </Diff>
      )
    ).toContain(INVALID);
  });
});

describe("PromptExchange", () => {
  it("takes one Prompt then one AiReply, and nothing else", () => {
    expect(exchangeParts([<Prompt key="p">a</Prompt>, "\n", <AiReply key="r">b</AiReply>])).not.toBeNull();
    expect(exchangeParts([<AiReply key="r">b</AiReply>, <Prompt key="p">a</Prompt>])).toBeNull();
    expect(exchangeParts(<Prompt>a</Prompt>)).toBeNull();
  });

  it("renders the prompt, the reply and a labelled verdict with its reason", () => {
    const html = renderToStaticMarkup(
      <PromptExchange verdict="fix" why="It ignored operator precedence." tool="IDE assistant">
        <Prompt>Add AND and OR to the parser.</Prompt>
        <AiReply>Here is the new parser.</AiReply>
      </PromptExchange>
    );
    expect(html.indexOf("You type")).toBeLessThan(html.indexOf("What came back"));
    expect(html).toContain("IDE assistant");
    expect(html).toContain("Add AND and OR to the parser.");
    expect(html).toContain("Verdict: Fix before using.");
    expect(html).toContain("It ignored operator precedence.");
    expect(html).not.toMatch(/copy/i);
    expect(html).not.toContain(INVALID);
  });

  it("reports a bad verdict or missing parts", () => {
    expect(
      renderToStaticMarkup(
        // @ts-expect-error: not a verdict
        <PromptExchange verdict="maybe" why="x">
          <Prompt>a</Prompt>
          <AiReply>b</AiReply>
        </PromptExchange>
      )
    ).toContain(INVALID);
    expect(
      renderToStaticMarkup(
        <PromptExchange verdict="accept" why="x">
          <Prompt>a</Prompt>
        </PromptExchange>
      )
    ).toContain(INVALID);
  });
});
