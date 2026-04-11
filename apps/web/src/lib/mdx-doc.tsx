import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { ReactElement } from "react";
import { compileMDX } from "next-mdx-remote/rsc";

export type ContentSection =
  | "learning-paths"
  | "interviews"
  | "system-design";

export async function getContentSlugs(section: ContentSection): Promise<string[]> {
  const dir = path.join(process.cwd(), "content", section);
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".mdx"))
    .map((e) => e.name.replace(/\.mdx$/, ""));
}

export async function loadMdxDoc(section: ContentSection, slug: string) {
  const filePath = path.join(process.cwd(), "content", section, `${slug}.mdx`);
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  const { content: mdxBody } = await compileMDX({
    source: content,
    options: { parseFrontmatter: false },
  });
  return {
    frontmatter: data as { title?: string; description?: string },
    body: mdxBody as ReactElement,
  };
}
