import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { ReactElement } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Root as MdastRoot } from "mdast";
import { rehypeHeadingIds, type DocHeading } from "@/lib/doc-headings";
import { rehypeMermaidSvg } from "@/lib/rehype-mermaid-svg";
import { remarkAssetRefs } from "@/lib/remark-asset-refs";
import { ModelCategory, ModelGrid, ModelCard } from "@/components/mdx/model-grid";
import { InterviewQuestions, InterviewQuestion } from "@/components/mdx/interview-qa";
import { Pre, MermaidSvg } from "@/components/mdx/code-block";
import { Img, Figure, Diagram as AssetDiagram, Mermaid, TechIcon, Download } from "@/components/mdx/assets";
import { KatexStyles } from "@/components/article/katex-styles";
import type { ContentSection, ContentMeta, ContentGroupDef } from "@/types/content";
import { Diagram } from "@/components/diagrams/diagram";
import {
  DatabasePicker,
  DatabaseWorkloadMatrix,
  CompareDatabases,
  DataModelView,
  DataModelTab,
  ScenarioCard,
  ScenarioGrid,
  CloudDecisionTree,
  CloudEquivalenceMatrix,
} from "@/lib/mdx-lazy-widgets";
import { DbProfile } from "@/components/db/db-profile";
import { Callout, StepCards, StepCard } from "@/components/db/callouts";
import { CloudGroupTable } from "@/components/cloud/cloud-group-table";
import { CloudServiceProfile } from "@/components/cloud/cloud-service-profile";
import { ResponsibilityGrid } from "@/components/cloud/responsibility-grid";
import { CloudMapping } from "@/components/cloud/cloud-mapping";
import { CloudOnly } from "@/components/cloud/cloud-only";

// Records whether the document has any math, so the KaTeX stylesheet is only loaded where it is needed.
function remarkDetectMath(flags: { math: boolean }) {
  return (tree: MdastRoot) => {
    const visit = (node: { type: string; children?: unknown[] }): boolean =>
      node.type === "math" || node.type === "inlineMath" || (node.children ?? []).some((c) => visit(c as typeof node));
    flags.math = visit(tree);
  };
}

export type { ContentSection };

export async function getContentSlugs(section: ContentSection): Promise<string[]> {
  const dir = path.join(process.cwd(), "content", section);
  
  async function walk(currentDir: string, basePath: string): Promise<string[]> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true }).catch(() => []);
    let slugs: string[] = [];
    for (const e of entries) {
      if (e.isDirectory()) {
        const nestedSlugs = await walk(path.join(currentDir, e.name), `${basePath}${e.name}/`);
        slugs = slugs.concat(nestedSlugs);
      } else if (e.isFile() && e.name.endsWith(".mdx")) {
        slugs.push(`${basePath}${e.name.replace(/\.mdx$/, "")}`);
      }
    }
    return slugs;
  }
  
  return walk(dir, "");
}

export async function loadMdxDoc(section: ContentSection, slug: string | string[]) {
  const slugPath = Array.isArray(slug) ? slug.join("/") : slug;
  const filePath = path.join(process.cwd(), "content", section, `${slugPath}.mdx`);
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  const headings: DocHeading[] = [];
  const flags = { math: false };
  // Lines taken up by the frontmatter, so plugin errors point at the right line of the file.
  const lineOffset = raw.split("\n").length - content.split("\n").length;
  const { content: mdxBody } = await compileMDX({
    source: content,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath, [remarkDetectMath, flags], remarkAssetRefs],
        rehypePlugins: [[rehypeMermaidSvg, { filePath, lineOffset }], rehypeKatex, [rehypeHeadingIds, { headings }]],
      },
    },
    components: {
      ModelCategory,
      ModelGrid,
      ModelCard,
      InterviewQuestions,
      InterviewQuestion,
      Figure,
      MermaidSvg,
      AnimatedDiagram: Diagram,
      // Asset library (plan §5.6): reusable media by ID from apps/web/assets/.
      Img,
      Diagram: AssetDiagram,
      Mermaid,
      TechIcon,
      Download,
      DatabasePicker,
      DatabaseWorkloadMatrix,
      CompareDatabases,
      DbProfile,
      DataModelView,
      DataModelTab,
      ScenarioCard,
      ScenarioGrid,
      Callout,
      StepCards,
      StepCard,
      CloudGroupTable,
      CloudServiceProfile,
      CloudDecisionTree,
      ResponsibilityGrid,
      CloudEquivalenceMatrix,
      CloudMapping,
      CloudOnly,
      pre: Pre,
    },
  });
  return {
    frontmatter: data as {
      title?: string;
      description?: string;
      icon?: string;
      categories?: string[];
      /** "classic" opts an article out of the docs-style layout (table of contents, updated date). */
      layout?: string;
      /** Overrides the last-updated date taken from git history at build time, as YYYY-MM-DD. */
      updated?: string | Date;
    },
    body: (flags.math ? (
      <>
        <KatexStyles />
        {mdxBody}
      </>
    ) : (
      mdxBody
    )) as ReactElement,
    hasMath: flags.math,
    headings,
    filePath,
  };
}

export function partitionSlugs(
  slugs: string[]
): { topLevel: string[]; children: Record<string, string[]> } {
  const topLevel: string[] = [];
  const children: Record<string, string[]> = {};
  for (const s of slugs) {
    if (s.includes("/")) {
      const [parent, ...rest] = s.split("/");
      if (!children[parent]) children[parent] = [];
      children[parent].push(rest.join("/"));
    } else {
      topLevel.push(s);
    }
  }
  return { topLevel, children };
}

export async function getTopLevelMeta(
  section: ContentSection
): Promise<ContentMeta[]> {
  const slugs = await getContentSlugs(section);
  const { topLevel } = partitionSlugs(slugs);
  const dir = path.join(process.cwd(), "content", section);

  const metas: ContentMeta[] = [];
  for (const slug of topLevel) {
    const filePath = path.join(dir, `${slug}.mdx`);
    const raw = await fs.readFile(filePath, "utf8");
    const { data } = matter(raw);
    metas.push({
      slug,
      title: (data.title as string) ?? slug,
      description: data.description as string | undefined,
      icon: data.icon as string | undefined,
      categories: data.categories as string[] | undefined,
      groups: data.groups as ContentGroupDef[] | undefined,
      area: data.area as string | undefined,
      order: typeof data.order === "number" ? data.order : undefined,
    });
  }
  // Hubs with an `order` frontmatter value come first, in that order; the rest keep file order.
  return metas
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (a.m.order ?? Infinity) - (b.m.order ?? Infinity) || a.i - b.i)
    .map(({ m }) => m);
}

// Articles (pages below a hub) that are written up, i.e. not marked `status: outline`.
export async function countWrittenArticles(sections: ContentSection[]): Promise<number> {
  let count = 0;
  for (const section of sections) {
    const { children } = partitionSlugs(await getContentSlugs(section));
    for (const [hub, slugs] of Object.entries(children)) {
      for (const slug of slugs) {
        const raw = await fs.readFile(path.join(process.cwd(), "content", section, hub, `${slug}.mdx`), "utf8");
        if (matter(raw).data.status !== "outline") count += 1;
      }
    }
  }
  return count;
}
