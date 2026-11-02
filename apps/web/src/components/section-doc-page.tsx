import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ArticleLayout } from "@/components/article-layout";
import { getContentSlugs, loadMdxDoc } from "@/lib/mdx-doc";
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

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 pt-6 md:px-8">
        <Breadcrumb items={crumbs} />
      </div>
      <ArticleLayout
        title={doc.frontmatter.title ?? slugPath}
        description={doc.frontmatter.description}
      >
        {doc.body}
      </ArticleLayout>
    </div>
  );
}
