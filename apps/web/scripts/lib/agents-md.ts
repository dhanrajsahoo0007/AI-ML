import fs from "node:fs";
import path from "node:path";

// Finds backticked repo paths and npm scripts in AGENTS.md that don't exist, so agent docs can't silently drift
// from the code. Sections under a heading containing "Planned" are skipped (target structure not built yet).

export interface Problem {
  line: number;
  token: string;
  reason: string;
}

export interface CheckContext {
  repoRoot: string;
  /** Workspace folders to try when a path isn't found from the repo root, e.g. ["apps/web"]. */
  workspaceDirs: string[];
  rootScripts: Record<string, string>;
  /** Scripts per workspace name, e.g. { web: {...} }, for `npm run x -w web`. */
  workspaceScripts: Record<string, Record<string, string>>;
}

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
  const bases = [ctx.repoRoot, ...ctx.workspaceDirs.map((dir) => path.join(ctx.repoRoot, dir))];
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
      if (looksLikePath(token) && !pathExists(token, ctx)) {
        problems.push({ line, token, reason: "path does not exist" });
      }
    }
  });
  return problems;
}
