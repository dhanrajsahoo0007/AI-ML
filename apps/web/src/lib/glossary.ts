import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { CONTENT_DIR, glossarySection } from "@/features/sections/registry";

// The glossary: content/<section>/glossary.yaml of the section marked `glossary: true` in sections.yaml, read
// once at build time. Used by <Term id> (hover definition + link) and <Glossary /> in src/components/teach/.
// Build-time module like the section registry: plain fs, no `server-only`, so scripts can load it too.

function owner() {
  const s = glossarySection();
  if (!s) throw new Error("No section in content/sections.yaml has `glossary: true` (needed by <Term> and <Glossary>)");
  return s;
}

/** The glossary YAML file, inside the owning section's content folder. */
export function glossaryFile(): string {
  return path.join(CONTENT_DIR, owner().key, "glossary.yaml");
}

/** The hover text has to stay short enough to read at a glance. */
export const SHORT_MAX = 160;

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const glossaryEntrySchema = z
  .object({
    id: z.string().regex(kebab, "ids are kebab-case"),
    term: z.string().min(1),
    short: z.string().min(1).max(SHORT_MAX, `short is at most ${SHORT_MAX} characters`),
    long: z.string().min(1).optional(),
    related: z.array(z.string().regex(kebab)).optional(),
  })
  .strict();

const glossarySchema = z.array(glossaryEntrySchema).superRefine((entries, ctx) => {
  const ids = new Set<string>();
  entries.forEach((e, i) => {
    if (ids.has(e.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `duplicate id "${e.id}"` });
    ids.add(e.id);
  });
  entries.forEach((e, i) => {
    e.related?.forEach((r, j) => {
      if (r === e.id)
        ctx.addIssue({ code: "custom", path: [i, "related", j], message: "an entry cannot relate to itself" });
      else if (!ids.has(r))
        ctx.addIssue({ code: "custom", path: [i, "related", j], message: `unknown related id "${r}"` });
    });
  });
});

type GlossaryEntry = z.output<typeof glossaryEntrySchema>;

/** Parses and validates glossary YAML text. Throws with every problem listed. */
export function parseGlossary(text: string, file = "glossary.yaml"): GlossaryEntry[] {
  const result = glossarySchema.safeParse(yaml.load(text));
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${file} [${i.path.join(".")}]: ${i.message}`);
    throw new Error(`Invalid glossary:\n${lines.join("\n")}`);
  }
  return result.data;
}

/** Entries sorted by term, case-insensitively, for the glossary page. */
export function sortByTerm(entries: readonly GlossaryEntry[]): GlossaryEntry[] {
  return [...entries].sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
}

/**
 * Link to one entry on the glossary page, or undefined while the owning section is not `on` (a `hidden` or
 * `off` section answers 404 to readers, so <Term> shows its definition without a link).
 */
export function termHref(id: string, section = owner()): string | undefined {
  return section.state === "on" ? `${section.href}/glossary#${id}` : undefined;
}

let cache: Map<string, GlossaryEntry> | null = null;

function entries(): Map<string, GlossaryEntry> {
  if (!cache) {
    const file = glossaryFile();
    const list = parseGlossary(fs.readFileSync(file, "utf8"), file);
    cache = new Map(list.map((e) => [e.id, e]));
  }
  return cache;
}

/** Every entry in file order. */
export function loadGlossary(): GlossaryEntry[] {
  return [...entries().values()];
}

/** One entry, or undefined for an unknown id. */
export function getTerm(id: string): GlossaryEntry | undefined {
  return entries().get(id);
}
