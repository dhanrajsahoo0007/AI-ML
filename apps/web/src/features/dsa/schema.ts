import { z } from "zod";
import { DIFFICULTIES, HARNESS_MODES, LANGUAGES } from "./constants";

// Schemas for the DSA section (plan §15.1): problem and topic frontmatter, the test-case files and the
// pattern list. Relative imports only and no JSX: content-check loads this with plain Node.
//
//   content/<section>/topics/<topic>.mdx       a topic (pattern) article, same MDX pipeline as docs
//   content/<section>/problems/<slug>.mdx      statement, then <PremiumBreak/>, then the editorial
//   content/<section>/tests/<slug>.public.json public test cases (shipped to the browser, run there)
//   content/<section>/tests/<slug>.hidden.json hidden test cases (never shipped; the Stage C judge runs them)
//   content/<section>/patterns.yaml            the patterns problems may be tagged with

export { LANGUAGES } from "./constants";

/** Minimum hidden cases a published problem should have (fewer is a content-check warning). */
export const MIN_HIDDEN_TESTS = 5;

/** The marker between the free statement and the editorial in a problem's MDX body. */
export const PREMIUM_BREAK = /^[ \t]*<PremiumBreak\s*\/>[ \t]*$/m;

const kebab = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be lowercase kebab-case");
const identifier = z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, "must be a function or class name");
const testPath = (kind: "public" | "hidden") =>
  z.string().regex(new RegExp(`^tests/[a-z0-9-]+\\.${kind}\\.json$`), `must be tests/<name>.${kind}.json`);

export const problemFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    /** One-line summary for search results and <meta name="description">; never the solution. */
    description: z.string().min(1),
    difficulty: z.enum(DIFFICULTIES),
    patterns: z.array(kebab).min(1),
    /** Topic slugs (content/<section>/topics/<topic>.mdx). */
    topics: z.array(kebab).min(1),
    /** Company slugs, validated against content/companies/companies.yaml. */
    companies: z.array(kebab).default([]),
    /** The editorial (and later the hidden-test judge). Unset: the section's access rules decide. */
    access: z.enum(["free", "premium"]).optional(),
    languages: z.array(z.enum(LANGUAGES)).min(1),
    /** Starter code per language; content-check requires one for every language in `languages`. */
    starter: z.partialRecord(z.enum(LANGUAGES), z.string().min(1)),
    /** The function or class the tests call, per language (two_sum in Python, twoSum in JavaScript). */
    entry: z.partialRecord(z.enum(LANGUAGES), identifier),
    mode: z.enum(HARNESS_MODES).default("function"),
    tests: z.object({ public: testPath("public"), hidden: testPath("hidden") }).strict(),
    complexity: z.object({ time: z.string().min(1), space: z.string().min(1) }).strict(),
    /** Site paths of related pages, e.g. /system-design/patterns/caching or /dsa/problems/two-sum. */
    related: z
      .array(z.string().regex(/^\/[a-z0-9/-]+$/, "must be a site path such as /system-design/patterns/caching"))
      .default([]),
    status: z.enum(["draft", "published"]).default("published"),
    order: z.number().optional(),
  })
  .strict();

export type ProblemFrontmatter = z.infer<typeof problemFrontmatterSchema>;

export const topicFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    icon: z.string().optional(),
    order: z.number().optional(),
    status: z.enum(["draft", "published"]).default("published"),
    /** Overrides the last-updated date taken from git history at build time, as YYYY-MM-DD. */
    updated: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.date()]).optional(),
  })
  .strict();

export type TopicFrontmatter = z.infer<typeof topicFrontmatterSchema>;

/** One test case: the arguments the entry is called with and the value it must return. */
export const testCaseSchema = z
  .object({
    name: z.string().min(1).optional(),
    args: z.array(z.unknown()),
    expected: z.unknown(),
  })
  .strict();

export type TestCase = z.infer<typeof testCaseSchema>;

export const testFileSchema = z.array(testCaseSchema).min(1);

/** Class-mode cases: args = [operations, arguments per operation], expected = one result per operation. */
export const classCaseSchema = z
  .object({
    name: z.string().optional(),
    args: z.tuple([z.array(z.string().min(1)).min(1), z.array(z.array(z.unknown()))]),
    expected: z.array(z.unknown()),
  })
  .superRefine((c, ctx) => {
    const [ops, opArgs] = c.args;
    if (ops.length !== opArgs.length) ctx.addIssue({ code: "custom", message: "one argument list per operation" });
    if (ops.length !== c.expected.length) ctx.addIssue({ code: "custom", message: "one expected value per operation" });
  });

export const patternsSchema = z
  .array(z.object({ slug: kebab, label: z.string().min(1) }).strict())
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.forEach((p, i) => {
      if (seen.has(p.slug)) ctx.addIssue({ code: "custom", path: [i, "slug"], message: `duplicate pattern ${p.slug}` });
      seen.add(p.slug);
    });
  });

export type Pattern = z.infer<typeof patternsSchema>[number];
