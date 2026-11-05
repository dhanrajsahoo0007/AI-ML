import fs from "node:fs/promises";
import path from "node:path";
import { isPathEnabled } from "@/config/features";
import { getContentSlugs } from "@/lib/mdx-doc";
import { toLlmMarkdown } from "@/lib/doc-meta";
import type { ContentSection } from "@/types/content";

const ARTICLE_SECTIONS: ContentSection[] = ["ai-system-design", "system-design", "ml-system-design", "cloud"];

// GET /api/markdown?path=/ai-system-design/genai-system-design/rag-fundamentals
// The article as plain Markdown, for the "Copy for LLM" button and "View as Markdown".
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pagePath = url.searchParams.get("path") ?? "";
  const [section, ...rest] = pagePath.replace(/^\/+|\/+$/g, "").split("/");
  const slug = rest.join("/");

  // Only known article slugs are served, so the path can never escape the content folder.
  if (!ARTICLE_SECTIONS.includes(section as ContentSection) || !isPathEnabled(`/${section}`)) {
    return new Response("Not found", { status: 404 });
  }
  const slugs = await getContentSlugs(section as ContentSection);
  if (!slugs.includes(slug)) return new Response("Not found", { status: 404 });

  const raw = await fs.readFile(path.join(process.cwd(), "content", section, `${slug}.mdx`), "utf8");
  const markdown = toLlmMarkdown(raw, `${url.origin}/${section}/${slug}`);
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
