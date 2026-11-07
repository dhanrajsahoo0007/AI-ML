import fs from "node:fs";
import path from "node:path";

// Finds backticked repo paths and npm scripts in agent docs (every AGENTS.md and every .claude/skills/*/SKILL.md)
// that don't exist, so agent docs can't silently drift from the code. Sections under a heading containing
// "Planned" are skipped (target structure not built yet). Build outputs (GENERATED_PREFIXES) are not checked:
// they don't exist in a fresh checkout.

export interface Problem {
  line: number;
  token: string;
  reason: string;
}

export interface CheckContext {
  repoRoot: string;
  /** Folder of the file being checked: relative paths such as `./kind.ts` or `index.ts` are tried here first. */
  fileDir?: string;
  /** Workspace folders to try when a path isn't found from the repo root, e.g. ["apps/web"]. */
  workspaceDirs: string[];
  rootScripts: Record<string, string>;
  /** Scripts per workspace name, e.g. { web: {...} }, for `npm run x -w web`. */
  workspaceScripts: Record<string, Record<string, string>>;
}

/** Folders written by the build (gitignored): named in docs, but absent in a fresh checkout, so never checked. */
export const GENERATED_PREFIXES = [
  "src/generated/",
  "apps/web/src/generated/",
  "public/_a/",
  "apps/web/public/_a/",
  ".build-cache/",
  "apps/web/.build-cache/",
  ".build/",
  "apps/web/.build/",
  ".next/",
  ".open-next/",
];

export const isGenerated = (token: string) =>
  GENERATED_PREFIXES.some((prefix) => token === prefix.slice(0, -1) || token.startsWith(prefix));

const PATH_EXTENSIONS = /\.(md|mdx|ts|tsx|js|mjs|cjs|json|jsonc|ya?ml|toml|css)$/;

/** Tokens that should be checked as repo paths (vs code, prose, routes or emails). */
export function looksLikePath(token: string): boolean {
  if (/\s/.test(token)) return false;
  if (/^(https?:)?\/\//.test(token)) return false;
  if (token.startsWith("/") || token.startsWith("@") || token.startsWith("<")) return false; // routes, packages, JSX
  if (token.includes("*") && !token.includes("/")) return false; // file-name patterns such as `*.test.ts`
  if (token.includes("@")) return false; // emails
  if (token.includes("/")) return true;
  if (/^\.[\w.-]+$/.test(token)) return true; // dotfiles: .nvmrc, .prettierrc.json
  return PATH_EXTENSIONS.test(token);
}

function expandBraces(token: string): string[] {
  const match = token.match(/\{([^{}]+)\}/);
  if (!match) return [token];
  return match[1].split(",").flatMap((part) => expandBraces(token.replace(match[0], part)));
}

function pathExists(token: string, ctx: CheckContext): boolean {
  // Placeholders such as `content/<section>/<slug>.mdx`: the part before the first placeholder must exist.
  const concrete = token.includes("<") ? token.slice(0, token.indexOf("<")) : token;
  const bases = [
    ...(ctx.fileDir ? [ctx.fileDir] : []),
    ctx.repoRoot,
    ...ctx.workspaceDirs.map((dir) => path.join(ctx.repoRoot, dir)),
  ];
  return expandBraces(concrete).every((candidate) =>
    bases.some((base) =>
      candidate.includes("*")
        ? fs.globSync(candidate, { cwd: base }).length > 0
        : fs.existsSync(path.join(base, candidate))
    )
  );
}

/** `npm run x`, `npm run x -w web`, `npm test`, `npm start`, as many as appear in the token. */
export function npmScriptsIn(token: string): { script: string; workspace?: string }[] {
  const found: { script: string; workspace?: string }[] = [];
  const re = /npm (?:run ([\w:.-]+)|(test|start))((?:\s+-w\s+[\w-]+)?)/g;
  for (const m of token.matchAll(re)) {
    const workspace = m[3]?.match(/-w\s+([\w-]+)/)?.[1];
    found.push({ script: m[1] ?? m[2], workspace });
  }
  return found;
}

export function findProblems(markdown: string, ctx: CheckContext): Problem[] {
  const problems: Problem[] = [];
  let inFence = false;
  let plannedLevel: number | null = null;

  markdown.split("\n").forEach((text, index) => {
    const line = index + 1;
    if (/^\s*```/.test(text)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const heading = text.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      if (plannedLevel !== null && level <= plannedLevel) plannedLevel = null;
      if (plannedLevel === null && /planned/i.test(heading[2])) plannedLevel = level;
      return;
    }
    if (plannedLevel !== null) return;

    for (const [, token] of text.matchAll(/`([^`]+)`/g)) {
      const scripts = npmScriptsIn(token);
      if (scripts.length > 0) {
        for (const { script, workspace } of scripts) {
          const scriptsOf = workspace ? ctx.workspaceScripts[workspace] : ctx.rootScripts;
          if (!scriptsOf) problems.push({ line, token, reason: `unknown workspace "${workspace}"` });
          else if (!(script in scriptsOf)) {
            problems.push({
              line,
              token,
              reason: `npm script "${script}" not found${workspace ? ` in ${workspace}` : ""}`,
            });
          }
        }
        continue;
      }
      if (looksLikePath(token) && !isGenerated(token.replace(/^\.\//, "")) && !pathExists(token, ctx)) {
        problems.push({ line, token, reason: "path does not exist" });
      }
    }
  });
  return problems;
}

// ── Files to check ──────────────────────────────────────────────────────────────────────────────────────────

/** Folders never searched for agent docs: dependencies, build output and other worktrees' checkouts. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".open-next",
  ".wrangler",
  ".build",
  ".build-cache",
  "test-results",
  "playwright-report",
  "coverage",
  "worktrees",
]);

/** Every AGENTS.md in the repo and every .claude/skills/<name>/SKILL.md, as repo-relative paths, sorted. */
export function findAgentDocs(repoRoot: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
      const rel = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(rel);
      } else if (entry.name === "AGENTS.md") {
        found.push(rel);
      } else if (entry.name === "SKILL.md" && /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(rel)) {
        found.push(rel);
      }
    }
  };
  walk("");
  return found.sort();
}

// ── Skills ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Checks a SKILL.md's frontmatter: `name` equal to its folder name and a `description` that starts with
 * "Use when", so agents can tell from the description alone when to load it.
 */
export function findSkillProblems(markdown: string, folderName: string): Problem[] {
  const fm = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) return [{ line: 1, token: "---", reason: "missing YAML frontmatter with name and description" }];
  const field = (key: string) =>
    fm[1]
      .match(new RegExp(`^${key}:\\s*(.*)$`, "m"))?.[1]
      .trim()
      .replace(/^["']|["']$/g, "");
  const problems: Problem[] = [];
  const name = field("name");
  if (name !== folderName) {
    problems.push({ line: 2, token: `name: ${name ?? ""}`, reason: `name must be the folder name "${folderName}"` });
  }
  const description = field("description");
  if (!description?.startsWith("Use when")) {
    problems.push({ line: 3, token: "description", reason: 'description must start with "Use when"' });
  }
  return problems;
}
