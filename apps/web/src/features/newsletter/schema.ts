import { z } from "zod";
import { COVER_MOTIFS, COVER_PALETTES } from "./cover/catalog";

// Newsletter issue frontmatter (plan §15.2): content/<section>/<yyyy>/<slug>.mdx. Relative imports only, so
// content-check and the send script can load it with plain Node.

export const ISSUE_STATUSES = ["draft", "scheduled", "sent"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_AUDIENCES = ["all", "pro"] as const;
export type IssueAudience = (typeof ISSUE_AUDIENCES)[number];

export const ISSUE_FORMATS = ["deep-dive", "digest"] as const;
export type IssueFormat = (typeof ISSUE_FORMATS)[number];

export const ISSUE_LEVELS = ["intro", "intermediate", "advanced"] as const;
export type IssueLevel = (typeof ISSUE_LEVELS)[number];

/** Longest summary that fits a search snippet and an email preview line; longer ones are warnings. */
export const SUMMARY_MAX = 200;
/** A takeaway is one line on a phone and on a carousel slide. */
export const TAKEAWAY_MAX = 160;
/** The LinkedIn hook: the first lines of a post, before "…see more". */
export const HOOK_MAX = 220;

/**
 * What each issue format must contain (warnings in content-check, so a draft can be work in progress). A new
 * format is a new entry here plus its template; nothing else in the pipeline is format-specific.
 */
export interface FormatRules {
  label: string;
  /** H2 headings the issue must have, matched by prefix ("How it works" matches "How it works: the loop"). */
  requiredHeadings: readonly string[];
  /** Fewest `asset:` figures. */
  minFigures: number;
  /** Most words in the body. */
  maxWords: number;
  /** Most words in a row without a figure or callout. */
  maxWordsBetweenVisuals: number;
  /** Allowed number of takeaways. */
  takeaways: readonly [min: number, max: number];
  /** Longest average sentence, in words. */
  maxAvgSentenceWords: number;
}

export const FORMATS: Record<IssueFormat, FormatRules> = {
  "deep-dive": {
    label: "Deep dive",
    requiredHeadings: [
      "Why this matters",
      "The idea in plain English",
      "How it works",
      "A worked example",
      "What goes wrong",
      "Try it yourself",
      "Go deeper",
    ],
    minFigures: 5,
    // A complete explainer: long enough to cover the topic end to end, short enough to finish in one sitting.
    maxWords: 4000,
    maxWordsBetweenVisuals: 350,
    takeaways: [3, 5],
    maxAvgSentenceWords: 22,
  },
  digest: {
    label: "Digest",
    requiredHeadings: [],
    minFigures: 0,
    maxWords: 1200,
    maxWordsBetweenVisuals: Number.POSITIVE_INFINITY,
    takeaways: [0, 5],
    maxAvgSentenceWords: 24,
  },
};

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A YAML date (gray-matter turns unquoted dates into Date objects) or a quoted YYYY-MM-DD string. */
const day = z
  .union([z.string().regex(isoDate, "must be YYYY-MM-DD"), z.date()])
  .transform((d) => (typeof d === "string" ? d : d.toISOString().slice(0, 10)));

/** A date and time with a time zone, e.g. 2026-11-14T09:00:00Z, as a string or a YAML timestamp. */
const instant = z
  .union([z.iso.datetime({ offset: true }), z.date()])
  .transform((d) => (typeof d === "string" ? new Date(d) : d));

/** A site path such as /ai-system-design/genai-system-design/harness-engineering (checked against routes later). */
const sitePath = z.string().regex(/^\/[a-z0-9\-/]*$/, "must be a site path starting with /");

export const coverSchema = z
  .object({
    motif: z.enum(COVER_MOTIFS),
    palette: z.enum(COVER_PALETTES),
    seed: z
      .number()
      .int()
      .min(0)
      .max(2 ** 31 - 1),
  })
  .strict();

export const issueFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    /** Issue number shown as "Issue #N"; 0 is a preview issue. Unique across the section. */
    issue: z.number().int().min(0).optional(),
    date: day,
    summary: z.string().min(1),
    format: z.enum(ISSUE_FORMATS).default("deep-dive"),
    series: z.string().regex(kebab, "series keys are kebab-case").optional(),
    tags: z.array(z.string().regex(kebab, "tags are kebab-case")).max(5).default([]),
    level: z.enum(ISSUE_LEVELS).optional(),
    /** Minutes; computed from the body when absent. */
    readingTime: z.number().int().min(1).max(60).optional(),
    cover: coverSchema.optional(),
    takeaways: z.array(z.string().min(1).max(TAKEAWAY_MAX)).max(5).default([]),
    /** Site articles for "Go deeper". */
    related: z.array(sitePath).max(6).default([]),
    /** LinkedIn share kit overrides. */
    share: z
      .object({ hook: z.string().min(1).max(HOOK_MAX).optional() })
      .strict()
      .optional(),
    access: z.enum(["free", "premium"]).default("free"),
    status: z.enum(ISSUE_STATUSES),
    sendAt: instant.optional(),
    audience: z.enum(ISSUE_AUDIENCES).default("all"),
  })
  .strict()
  .superRefine((fm, ctx) => {
    if (fm.status === "scheduled" && !fm.sendAt) {
      ctx.addIssue({ code: "custom", path: ["sendAt"], message: "scheduled issues need sendAt" });
    }
    // A draft may be unfinished; anything that goes out needs its number and cover (archive, email, social cards).
    if (fm.status !== "draft") {
      if (fm.issue === undefined) ctx.addIssue({ code: "custom", path: ["issue"], message: "required once scheduled" });
      if (!fm.cover) ctx.addIssue({ code: "custom", path: ["cover"], message: "required once scheduled" });
    }
  });
export type IssueFrontmatter = z.output<typeof issueFrontmatterSchema>;
