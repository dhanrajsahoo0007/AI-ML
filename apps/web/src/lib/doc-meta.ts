import "server-only";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import matter from "gray-matter";

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

// Attributes worth keeping as text when an MDX component is flattened to Markdown.
const TEXT_ATTRS = ["title", "workload", "problem", "pick", "label", "caption"] as const;

function attrs(source: string) {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

// Turns an MDX article into plain Markdown for pasting into an LLM: frontmatter and imports go, interview
// questions become Q/A pairs, diagrams become a caption line, and other components are unwrapped so their
// text content stays.
export function toLlmMarkdown(raw: string, url: string) {
  const { data, content } = matter(raw);
  let md = content.replace(/^(import|export)\s.*$/gm, "");

  md = md.replace(
    /<InterviewQuestion\s((?:[^>"]|"[^"]*")*)>([\s\S]*?)<\/InterviewQuestion>/g,
    (_, a: string, body: string) => `**Q: ${attrs(a).question ?? ""}**\n\n${body.trim()}\n`,
  );

  // Self-closing components: keep a caption or title if they have one, otherwise drop them.
  md = md.replace(/<([A-Z]\w*)((?:\s+\w+(?:=(?:"[^"]*"|\{[^}]*\}))?)*)\s*\/>/g, (_, name: string, a: string) => {
    const v = attrs(a);
    const label = v.caption ?? v.title;
    return label ? `_[${name === "AnimatedDiagram" ? "Diagram" : "Interactive"}: ${label}]_` : "";
  });

  // Opening tags of wrapper components: surface their text attributes as a bold lead-in.
  md = md.replace(/<([A-Z]\w*)((?:\s+\w+(?:=(?:"[^"]*"|\{[^}]*\}))?)*)\s*>/g, (_, _name: string, a: string) => {
    const v = attrs(a);
    const parts = TEXT_ATTRS.filter((k) => v[k]).map((k) => (k === "pick" ? `Answer: ${v[k]}` : v[k]));
    return parts.length ? `\n**${parts.join(" — ")}**\n` : "";
  });
  md = md.replace(/<\/[A-Z]\w*>/g, "");

  md = md.replace(/\n{3,}/g, "\n\n").trim();
  const header = [`# ${data.title ?? ""}`, data.description ? `> ${data.description}` : "", `Source: ${url}`]
    .filter(Boolean)
    .join("\n\n");
  return `${header}\n\n${md}\n`;
}
