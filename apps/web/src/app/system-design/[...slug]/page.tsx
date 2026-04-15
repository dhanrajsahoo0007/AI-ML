import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ArticleLayout } from "@/components/article-layout";
import { getContentSlugs, loadMdxDoc } from "@/lib/mdx-doc";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getContentSlugs("system-design");
  return slugs.map((slug) => ({ slug: slug.split("/") }));
}

export default async function SystemDesignPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const allSlugs = await getContentSlugs("system-design");
  if (!allSlugs.includes(slugPath)) notFound();

  const doc = await loadMdxDoc("system-design", slug);

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "ML System Design", href: "/system-design" },
  ];
  if (slug.length > 1) {
    crumbs.push({
      label: slug[0].replaceAll("-", " "),
      href: `/system-design/${slug[0]}`,
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
