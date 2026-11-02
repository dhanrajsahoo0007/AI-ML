import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import type { BreadcrumbItem } from "@/types/content";
import { ArticleLayout } from "@/components/article-layout";
import { getContentSlugs, loadMdxDoc } from "@/lib/mdx-doc";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getContentSlugs("learning-paths");
  return slugs.map((slug) => ({ slug: slug.split("/") }));
}

export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const allSlugs = await getContentSlugs("learning-paths");
  if (!allSlugs.includes(slugPath)) notFound();

  const doc = await loadMdxDoc("learning-paths", slug);

  const crumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Learning Paths", href: "/learning-paths" },
  ];
  if (slug.length > 1) {
    crumbs.push({
      label: slug[0].replaceAll("-", " "),
      href: `/learning-paths/${slug[0]}`,
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
