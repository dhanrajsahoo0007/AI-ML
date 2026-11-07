import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { cache, type ReactElement } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { rehypeHeadingIds, type DocHeading } from "@/lib/doc-headings";
import { business } from "@/config/business";
import { resolvePlaceholders } from "./placeholders";

// Loads a simple site page (legal, contact, security) from content/pages/<slug>.mdx. Same compile approach
// as the article loader in lib/mdx-doc.tsx, minus the article components, plus placeholder resolution.

export interface PageDoc {
  title: string;
  description?: string;
  body: ReactElement;
  headings: DocHeading[];
}

export const loadPageDoc = cache(async function loadPageDoc(slug: string): Promise<PageDoc> {
  const filePath = path.join(process.cwd(), "content", "pages", `${slug}.mdx`);
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  const headings: DocHeading[] = [];
  const { content: body } = await compileMDX({
    source: resolvePlaceholders(content, business),
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [[rehypeHeadingIds, { headings }]],
      },
    },
  });
  return {
    title: resolvePlaceholders(String(data.title ?? slug), business, { escape: false }),
    description:
      typeof data.description === "string"
        ? resolvePlaceholders(data.description, business, { escape: false })
        : undefined,
    body: body as ReactElement,
    headings,
  };
});

/** Metadata for a page, read from its frontmatter. */
export async function pageMetadata(slug: string) {
  const { title, description } = await loadPageDoc(slug);
  return { title, description, alternates: { canonical: `/${slug}` } };
}
