import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findAgentDocs,
  findProblems,
  findSkillProblems,
  isGenerated,
  looksLikePath,
  npmScriptsIn,
  type CheckContext,
} from "../../scripts/lib/agents-md";

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

describe("findProblems in a per-feature AGENTS.md", () => {
  it("resolves paths relative to the file's folder first, then the repo root and workspaces", () => {
    const fileDir = path.join(ctx.repoRoot, "apps/web/src/server/edge");
    const md = "See `entitlement.ts`, `./sections-gate.ts`, `src/middleware.ts`, `nope.ts` and `./gone.ts`.";
    expect(findProblems(md, { ...ctx, fileDir }).map((p) => p.token)).toEqual(["nope.ts", "./gone.ts"]);
  });

  it("does not check build outputs that a fresh checkout doesn't have", () => {
    expect(isGenerated("src/generated/hidden-routes.json")).toBe(true);
    expect(isGenerated("apps/web/public/_a/")).toBe(true);
    expect(isGenerated("src/generated")).toBe(true);
    expect(isGenerated("src/lib/icons.ts")).toBe(false);
    const md = "`src/generated/hidden-routes.json` and `.build-cache/mermaid/` and `apps/web/.build/mail`";
    expect(findProblems(md, ctx)).toEqual([]);
  });
});

describe("findSkillProblems", () => {
  const skill = (fm: string) => `---\n${fm}\n---\n\n# Skill\n`;

  it("accepts a name equal to the folder and a Use-when description", () => {
    expect(
      findSkillProblems(skill("name: add-article\ndescription: Use when adding an article."), "add-article")
    ).toEqual([]);
  });

  it("reports a wrong name, a description that doesn't start with Use when, and missing frontmatter", () => {
    const problems = findSkillProblems(skill("name: other\ndescription: Adds an article."), "add-article");
    expect(problems.map((p) => p.reason)).toEqual([
      'name must be the folder name "add-article"',
      'description must start with "Use when"',
    ]);
    expect(findSkillProblems("# No frontmatter", "x")[0].reason).toMatch(/missing YAML frontmatter/);
  });
});

describe("findAgentDocs", () => {
  it("finds every AGENTS.md and every .claude/skills/*/SKILL.md, skipping dependencies and worktrees", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "agents-md-"));
    const write = (rel: string) => {
      fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), "x");
    };
    [
      "AGENTS.md",
      "apps/web/src/features/auth/AGENTS.md",
      ".claude/skills/add-article/SKILL.md",
      ".claude/skills/add-article/notes/SKILL.md",
      ".claude/worktrees/other/AGENTS.md",
      "node_modules/pkg/AGENTS.md",
      "docs/SKILL.md",
      "apps/web/README.md",
    ].forEach(write);
    try {
      expect(findAgentDocs(root)).toEqual([
        ".claude/skills/add-article/SKILL.md",
        "AGENTS.md",
        "apps/web/src/features/auth/AGENTS.md",
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
