import { z } from "zod";

// Schemas for content/sections.yaml, content/features.yaml and article frontmatter (plan §5.1, §5.3).
// Relative imports only: this module is also loaded by next.config.ts and the scripts under scripts/.

export const APP_ENVS = ["local", "preview", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export const RELEASE_STATES = ["on", "hidden", "off"] as const;
export type ReleaseState = (typeof RELEASE_STATES)[number];

export const SECTION_KINDS = ["docs", "question-bank", "directory", "problems", "newsletter"] as const;
export type SectionKindName = (typeof SECTION_KINDS)[number];

/** Kinds whose module and routes exist. Sections of other kinds show as "coming soon" in the nav. */
export const KINDS_WITH_ROUTES: readonly SectionKindName[] = [
  "docs",
  "question-bank",
  "directory",
  "problems",
  "newsletter",
];

export const NAV_GROUPS = ["learn", "practice", "more"] as const;
export type NavGroupName = (typeof NAV_GROUPS)[number];

const state = z.enum(RELEASE_STATES);
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be lowercase kebab-case");

export const releaseSchema = z.object({ local: state, preview: state, staging: state, production: state }).strict();

/** A docs hub's own release: `on` or `off` per environment (no `hidden`; the section's state applies on top). */
const hubState = z.enum(["on", "off"]);
export const hubReleaseSchema = z
  .object({ local: hubState, preview: hubState, staging: hubState, production: hubState })
  .strict();

export const sectionEntrySchema = z
  .object({
    key: slug,
    kind: z.enum(SECTION_KINDS),
    label: z.string().min(1),
    /** Shorter label for the header bar; `label` is used everywhere else. */
    shortLabel: z.string().min(1).max(16).optional(),
    href: z.string().regex(/^\/[a-z0-9-]+$/, "must be a top-level path such as /cloud"),
    icon: z.string().min(1),
    navGroup: z.enum(NAV_GROUPS),
    order: z.number().int(),
    release: releaseSchema,
    access: z
      .object({
        default: z.enum(["free", "premium"]),
        alwaysFree: z.array(z.string()).optional(),
        premiumAnswers: z.string().optional(),
      })
      .strict()
      .optional(),
    /** Its articles may contain <InterviewQuestion> blocks, which must be filed in question-bank/articles.yaml. */
    questions: z.boolean().optional(),
    /** Its items carry company tags that Company Questions aggregates. */
    companyTags: z.boolean().optional(),
    /** Sections whose company tags this directory aggregates. */
    aggregates: z.array(slug).optional(),
    /** Who approves moving it to production. */
    owner: z.string().optional(),
    /** Title and subtitle on the section index page. */
    hub: z
      .object({ title: z.string().min(1), subtitle: z.string().min(1) })
      .strict()
      .optional(),
    /**
     * Docs only: hubs (top-level slugs) with their own release, e.g. a parked hub inside a live section. A hub
     * that is `off` in an environment is not built, listed, linked or indexed there; hubs not named follow the
     * section.
     */
    hubRelease: z.record(slug, hubReleaseSchema).optional(),
    /** Old URLs that now live in this section; `fallback` is used while the section is not `on`. */
    redirects: z
      .array(z.object({ from: z.string(), to: z.string(), fallback: z.string().optional() }).strict())
      .optional(),
  })
  .strict();

export const registrySchema = z.array(sectionEntrySchema).superRefine((sections, ctx) => {
  const keys = new Set<string>();
  const hrefs = new Set<string>();
  sections.forEach((s, i) => {
    if (keys.has(s.key)) ctx.addIssue({ code: "custom", path: [i, "key"], message: `duplicate key ${s.key}` });
    if (hrefs.has(s.href)) ctx.addIssue({ code: "custom", path: [i, "href"], message: `duplicate href ${s.href}` });
    keys.add(s.key);
    hrefs.add(s.href);
    // The key is the URL segment and the content folder name, so the two never drift apart.
    if (s.href !== `/${s.key}`) ctx.addIssue({ code: "custom", path: [i, "href"], message: `href must be /${s.key}` });
    if (s.kind === "docs" && !s.hub) {
      ctx.addIssue({ code: "custom", path: [i, "hub"], message: "docs sections need hub.title and hub.subtitle" });
    }
    if (s.hubRelease && s.kind !== "docs") {
      ctx.addIssue({ code: "custom", path: [i, "hubRelease"], message: "hubRelease is for docs sections only" });
    }
  });
  sections.forEach((s, i) => {
    for (const a of s.aggregates ?? []) {
      if (!keys.has(a)) ctx.addIssue({ code: "custom", path: [i, "aggregates"], message: `unknown section ${a}` });
    }
  });
});

export type SectionEntry = z.infer<typeof sectionEntrySchema>;

/**
 * A registry entry with its release state resolved for the current environment. `offHubs` lists the hubs
 * (from `hubRelease`) that are `off` in this environment.
 */
export type SectionDef = SectionEntry & { state: ReleaseState; offHubs?: string[] };

// content/features.yaml: non-section switches in the same per-environment format.
const switchState = z.enum(["on", "off"]);
export const featuresSchema = z.record(
  z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
  z.object({ local: switchState, preview: switchState, staging: switchState, production: switchState }).strict()
);

// Article and hub frontmatter (§5.3). `area` was unused and is dropped.
export const docGroupSchema = z
  .object({ name: z.string().min(1), icon: z.string().optional(), categories: z.array(z.string()) })
  .strict();

export const frontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    icon: z.string().optional(),
    status: z.enum(["outline", "draft", "published"]).optional(),
    access: z.enum(["free", "premium"]).optional(),
    preview: z.number().int().nonnegative().optional(),
    order: z.number().optional(),
    categories: z.array(z.string()).optional(),
    groups: z.array(docGroupSchema).optional(),
    layout: z.enum(["docs", "classic"]).optional(),
    updated: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.date()]).optional(),
    seo: z
      .object({ title: z.string().optional(), ogImage: z.string().optional(), noindex: z.boolean().optional() })
      .strict()
      .optional(),
  })
  .strict();

export type Frontmatter = z.infer<typeof frontmatterSchema>;

/** Longest description that fits a search result snippet; longer ones are reported as warnings. */
export const DESCRIPTION_MAX = 160;

// content/<section>/_index.yaml: the nav index for a docs section (§5.2), generated from the hub MDX.
export const navCardSchema = z
  .object({
    title: z.string().min(1),
    href: z.string().regex(/^\//),
    icon: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["outline", "draft", "published"]).optional(),
  })
  .strict();

export const navCategorySchema = z
  .object({
    title: z.string().min(1),
    icon: z.string().optional(),
    subtitle: z.string().optional(),
    cards: z.array(navCardSchema),
  })
  .strict();

export const navIndexSchema = z
  .object({
    hubs: z.array(z.object({ slug, categories: z.array(navCategorySchema) }).strict()),
  })
  .strict();

export type NavIndex = z.infer<typeof navIndexSchema>;
export type NavIndexCategory = z.infer<typeof navCategorySchema>;
export type NavIndexCard = z.infer<typeof navCardSchema>;
