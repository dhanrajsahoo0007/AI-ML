import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { isFeatureOn } from "../../config/features";
import { docsKind } from "../docs/kind";
import { loadDocItems, type DocItem } from "../docs/source";
import { builtSectionsOfKind, CONTENT_DIR, resolveAppEnv, type AppEnv, type SectionDef } from "../sections/registry";

// The access model (plan §9.1), resolved once per build. Build-time module: it reads content from disk, so it
// runs in next.config.ts (to write premium-routes.json for middleware), in generateStaticParams and in page
// renders at build, never at request time. Relative imports only.
//
// - docs articles: frontmatter `access`, else the section default in sections.yaml (`alwaysFree` hubs/outlines)
// - Interview Practice: answers are premium per category (`access: premium` in question-bank/taxonomy.yaml)
//   when the section says `premiumAnswers: per-category`
// - with the `paywall` switch off (content/features.yaml) nothing is premium: every page is fully free

/** The `paywall` switch for this build's environment. */
export function paywallOn(): boolean {
  return isFeatureOn("paywall");
}

/** A docs page that is premium in this build: never a hub, and never while the paywall is off. */
export function isPremiumDoc(section: SectionDef, item: DocItem): boolean {
  return paywallOn() && !item.isHub && docsKind.access(section, item) === "premium";
}

const taxonomySchema = z.array(
  z.looseObject({
    slug: z.string(),
    flag: z.string().optional(),
    access: z.enum(["free", "premium"]).optional(),
    subsections: z.array(z.looseObject({ slug: z.string() })),
  })
);

/** Interview categories whose answers are premium in this build (visible categories only). */
export function premiumAnswerCategories(): { slug: string; subsections: string[] }[] {
  if (!paywallOn()) return [];
  const bank = builtSectionsOfKind("question-bank")[0];
  if (!bank || bank.access?.premiumAnswers !== "per-category") return [];
  const file = path.join(CONTENT_DIR, "question-bank", "taxonomy.yaml");
  const categories = taxonomySchema.parse(yaml.load(fs.readFileSync(file, "utf8")));
  return categories
    .filter((c) => c.access === "premium" && (!c.flag || isFeatureOn(c.flag)))
    .map((c) => ({ slug: c.slug, subsections: c.subsections.map((s) => s.slug) }));
}

export interface PremiumRoutesManifest {
  env: AppEnv;
  paywall: boolean;
  /** Canonical paths of premium pages; each has a public preview at `<path>/_preview`. */
  routes: string[];
}

/** Written to src/generated/premium-routes.json at build for middleware (plan §9.2). */
export function premiumRoutes(): PremiumRoutesManifest {
  const routes: string[] = [];
  if (paywallOn()) {
    for (const section of builtSectionsOfKind("docs")) {
      for (const item of loadDocItems(section)) if (isPremiumDoc(section, item)) routes.push(item.href);
    }
    const bank = builtSectionsOfKind("question-bank")[0];
    for (const c of premiumAnswerCategories()) {
      routes.push(`${bank.href}/${c.slug}`, ...c.subsections.map((s) => `${bank.href}/${c.slug}/${s}`));
    }
  }
  return { env: resolveAppEnv(), paywall: paywallOn(), routes: [...new Set(routes)].sort() };
}
