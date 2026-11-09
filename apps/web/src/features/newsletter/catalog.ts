import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { CONTENT_DIR } from "../sections/registry";

// The closed lists of tags and series an issue may use: content/newsletter/catalog.yaml. Build time only (fs);
// plain Node, so content-check and the send script can load it.

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const catalogSchema = z
  .object({
    tags: z.record(z.string().regex(kebab, "tag keys are kebab-case"), z.string().min(1)),
    series: z.record(
      z.string().regex(kebab, "series keys are kebab-case"),
      z.object({ title: z.string().min(1), description: z.string().min(1) }).strict()
    ),
  })
  .strict();
export type NewsletterCatalog = z.output<typeof catalogSchema>;

export const CATALOG_FILE = "catalog.yaml";

const cache = new Map<string, NewsletterCatalog>();

/** The section's catalog; an empty one when the file is missing (content-check reports a bad file). */
export function loadCatalog(sectionKey: string): NewsletterCatalog {
  const hit = cache.get(sectionKey);
  if (hit) return hit;
  const file = path.join(CONTENT_DIR, sectionKey, CATALOG_FILE);
  const parsed = fs.existsSync(file) ? catalogSchema.safeParse(yaml.load(fs.readFileSync(file, "utf8"))) : null;
  const catalog = parsed?.success ? parsed.data : { tags: {}, series: {} };
  cache.set(sectionKey, catalog);
  return catalog;
}

/** Problems with the catalog file itself, for validate(). */
export function catalogProblems(sectionKey: string): string[] {
  const file = path.join(CONTENT_DIR, sectionKey, CATALOG_FILE);
  if (!fs.existsSync(file)) return [];
  const parsed = catalogSchema.safeParse(yaml.load(fs.readFileSync(file, "utf8")));
  return parsed.success ? [] : parsed.error.issues.map((i) => `${CATALOG_FILE} ${i.path.join(".")}: ${i.message}`);
}

export const tagLabel = (catalog: NewsletterCatalog, tag: string) => catalog.tags[tag] ?? tag;
