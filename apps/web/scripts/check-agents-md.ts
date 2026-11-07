// Fails if an agent doc names a repo path or npm script that doesn't exist. Run: `npm run check:agents-md`.
// Checks every AGENTS.md in the repo (root and per-feature) and every .claude/skills/<name>/SKILL.md (whose
// frontmatter must also have `name` = folder and a "Use when…" description). Sections under a "Planned" heading
// are skipped.
import fs from "node:fs";
import path from "node:path";
import { findAgentDocs, findProblems, findSkillProblems, type Problem } from "./lib/agents-md";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(repoRoot, file), "utf8"));

const rootPkg = readJson("package.json");
const webPkg = readJson("apps/web/package.json");

const files = findAgentDocs(repoRoot);
let total = 0;

for (const file of files) {
  const markdown = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const problems: Problem[] = findProblems(markdown, {
    repoRoot,
    fileDir: path.join(repoRoot, path.dirname(file)),
    workspaceDirs: ["apps/web"],
    rootScripts: rootPkg.scripts ?? {},
    workspaceScripts: { [webPkg.name]: webPkg.scripts ?? {} },
  });
  if (file.endsWith("SKILL.md")) problems.unshift(...findSkillProblems(markdown, path.basename(path.dirname(file))));
  for (const p of problems) console.error(`${file}:${p.line}  \`${p.token}\`  ${p.reason}`);
  total += problems.length;
}

if (total > 0) {
  console.error(
    `\n${total} stale reference(s). Fix the path or script, or move not-yet-built items under a "Planned" heading.`
  );
  process.exit(1);
}
console.log(`Agent docs: ${files.length} files checked; all referenced paths and npm scripts exist.`);
