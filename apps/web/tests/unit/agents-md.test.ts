import path from "node:path";
import { describe, expect, it } from "vitest";
import { findProblems, looksLikePath, npmScriptsIn, type CheckContext } from "../../scripts/lib/agents-md";

const ctx: CheckContext = {
  repoRoot: path.resolve(__dirname, "../../../.."),
  workspaceDirs: ["apps/web"],
  rootScripts: { build: "", test: "" },
  workspaceScripts: { web: { "e2e:chromium": "" } },
};

describe("looksLikePath", () => {
  it.each(["apps/web/src", ".nvmrc", "README.md", "src/lib/{a,b}.ts", "content/<section>/x.mdx"])("%s is a path", (t) =>
    expect(looksLikePath(t)).toBe(true)
  );
  it.each(["/api/*", "@smoke", "a@b.com", "tsc --noEmit", "*.test.ts", "main", "<InterviewQuestion>"])(
    "%s is not a path",
    (t) => expect(looksLikePath(t)).toBe(false)
  );
});

describe("npmScriptsIn", () => {
  it("finds every script and its workspace", () => {
    expect(npmScriptsIn("npm run build && npm test && npm run e2e:chromium -w web")).toEqual([
      { script: "build", workspace: undefined },
      { script: "test", workspace: undefined },
      { script: "e2e:chromium", workspace: "web" },
    ]);
  });
});

describe("findProblems", () => {
  it("reports missing paths and scripts, but not inside code fences or Planned sections", () => {
    const md = [
      "# Doc",
      "See `apps/web/package.json`, `apps/web/nope.ts`, `src/lib/utils.ts` and `npm run missing`.",
      "Run `npm run e2e:chromium -w web`.",
      "```",
      "`apps/web/also-missing.ts`",
      "```",
      "## Planned",
      "- `apps/web/src/server/db/` and `npm run db:migrate`",
      "### Detail",
      "- `apps/web/still-planned.ts`",
      "## Next",
      "- `apps/web/back-to-checking.ts`",
    ].join("\n");

    expect(findProblems(md, ctx).map((p) => [p.line, p.token])).toEqual([
      [2, "apps/web/nope.ts"],
      [2, "npm run missing"],
      [12, "apps/web/back-to-checking.ts"],
    ]);
  });
});
