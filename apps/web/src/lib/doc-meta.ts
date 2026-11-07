import "server-only";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const updatedCache = new Map<string, string | null>();

// Last time an article changed: the `updated` frontmatter value if set, else the date of the last git
// commit that touched the file. Returns an ISO date, or null when neither is available (e.g. a build
// without git history), in which case the page simply shows no date.
export async function getUpdatedDate(filePath: string, override?: string | Date): Promise<string | null> {
  if (override) return new Date(override).toISOString();
  if (updatedCache.has(filePath)) return updatedCache.get(filePath)!;
  let iso: string | null = null;
  try {
    const { stdout } = await run("git", ["log", "-1", "--format=%cI", "--", path.basename(filePath)], {
      cwd: path.dirname(filePath),
      timeout: 5000,
    });
    iso = stdout.trim() || null;
  } catch {
    iso = null;
  }
  updatedCache.set(filePath, iso);
  return iso;
}
