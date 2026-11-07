import { z } from "zod";

// Newsletter issue frontmatter (plan §15.2): content/<section>/<yyyy>/<slug>.mdx. Relative imports only, so
// content-check and the send script can load it with plain Node.

export const ISSUE_STATUSES = ["draft", "scheduled", "sent"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_AUDIENCES = ["all", "pro"] as const;
export type IssueAudience = (typeof ISSUE_AUDIENCES)[number];

/** Longest summary that fits a search snippet and an email preview line; longer ones are warnings. */
export const SUMMARY_MAX = 200;

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** A YAML date (gray-matter turns unquoted dates into Date objects) or a quoted YYYY-MM-DD string. */
const day = z
  .union([z.string().regex(isoDate, "must be YYYY-MM-DD"), z.date()])
  .transform((d) => (typeof d === "string" ? d : d.toISOString().slice(0, 10)));

/** A date and time with a time zone, e.g. 2026-11-14T09:00:00Z, as a string or a YAML timestamp. */
const instant = z
  .union([z.iso.datetime({ offset: true }), z.date()])
  .transform((d) => (typeof d === "string" ? new Date(d) : d));

export const issueFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    date: day,
    summary: z.string().min(1),
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
  });

export type IssueFrontmatter = z.infer<typeof issueFrontmatterSchema>;
