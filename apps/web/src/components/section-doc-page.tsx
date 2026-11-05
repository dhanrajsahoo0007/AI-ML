import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ArticleLayout } from "@/components/article-layout";
import { getContentSlugs, loadMdxDoc } from "@/lib/mdx-doc";
import { getUpdatedDate } from "@/lib/doc-meta";
import type { BreadcrumbItem, ContentSection } from "@/types/content";

// Article page for catch-all section routes (/<section>/<hub>/<article>).
export async function SectionDocPage({
  section,
  label,
  slug,
}: {
  section: ContentSection;
  label: string;
  slug: string[];
}) {
  const slugPath = slug.join("/");
  const allSlugs = await getContentSlugs(section);
  if (!allSlugs.includes(slugPath)) notFound();

  const doc = await loadMdxDoc(section, slug);

  const crumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label, href: `/${section}` },
  ];
  if (slug.length > 1) {
    crumbs.push({
      label: slug[0].replaceAll("-", " "),
      href: `/${section}/${slug[0]}`,
    });
  }
  crumbs.push({ label: doc.frontmatter.title ?? slugPath });

  // Articles (pages below a hub) use the docs-style layout: table of contents, updated date, copy for LLM.
  // Hubs stay card grids, and an article can opt out with `layout: classic` in its frontmatter.
  const docsLayout = slug.length > 1 && doc.frontmatter.layout !== "classic";
  const docs = docsLayout
    ? {
        headings: doc.headings,
        updated: await getUpdatedDate(doc.filePath, doc.frontmatter.updated),
        pagePath: `/${section}/${slugPath}`,
      }
    : undefined;

  return (
    <div>
      <div className={`mx-auto px-4 pt-6 md:px-8 ${docsLayout ? "max-w-6xl" : "max-w-4xl"}`}>
        <Breadcrumb items={crumbs} />
      </div>
      <ArticleLayout
        title={doc.frontmatter.title ?? slugPath}
        description={doc.frontmatter.description}
        docs={docs}
      >
        {doc.body}
      </ArticleLayout>
    </div>
  );
}
