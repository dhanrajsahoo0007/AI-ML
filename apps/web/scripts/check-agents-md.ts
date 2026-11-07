// Fails if AGENTS.md names a repo path or npm script that doesn't exist. Run: `npm run check:agents-md`.
import fs from "node:fs";
import path from "node:path";
import { findProblems } from "./lib/agents-md";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(repoRoot, file), "utf8"));

const rootPkg = readJson("package.json");
const webPkg = readJson("apps/web/package.json");

const problems = findProblems(fs.readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8"), {
  repoRoot,
  workspaceDirs: ["apps/web"],
  rootScripts: rootPkg.scripts ?? {},
  workspaceScripts: { [webPkg.name]: webPkg.scripts ?? {} },
});

if (problems.length > 0) {
  for (const p of problems) console.error(`AGENTS.md:${p.line}  \`${p.token}\`  ${p.reason}`);
  console.error(
    `\n${problems.length} stale reference(s). Fix the path or script, or move not-yet-built items under the "Planned" heading.`
  );
  process.exit(1);
}
console.log("AGENTS.md: all referenced paths and npm scripts exist.");
