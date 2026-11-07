import "server-only";
import fs from "node:fs/promises";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { Pre } from "@/components/mdx/code-block";
import { Callout } from "@/components/db/callouts";
import { splitProblemBody, type ValidProblem } from "./source";

// Compiles a problem's MDX in two separate parts, split at <PremiumBreak/>: the statement, and the editorial.
// A premium editorial is never compiled for the public page, so it cannot reach its HTML or RSC payload; the
// page shows a Pro placeholder in its place (plan §9.2, §15.1). Topics use the docs pipeline (loadMdxDoc).

const components = { pre: Pre, Callout };

async function compile(source: string) {
  const { content } = await compileMDX({
    source,
    options: { parseFrontmatter: false, mdxOptions: { remarkPlugins: [remarkGfm] } },
    components,
  });
  return content;
}

export async function problemStatement(problem: ValidProblem) {
  const { content } = matter(await fs.readFile(problem.file, "utf8"));
  return compile(splitProblemBody(content).statement);
}

/** Only call for an editorial the visitor may read (free problems until Phase 5's entitlement check). */
export async function problemEditorial(problem: ValidProblem) {
  const { content } = matter(await fs.readFile(problem.file, "utf8"));
  const { editorial } = splitProblemBody(content);
  return editorial === null ? null : compile(editorial);
}
