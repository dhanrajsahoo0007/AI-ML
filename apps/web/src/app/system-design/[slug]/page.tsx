import { notFound } from "next/navigation";
import { ArticleLayout } from "@/components/article-layout";
import { getContentSlugs, loadMdxDoc } from "@/lib/mdx-doc";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getContentSlugs("system-design");
  return slugs.map((slug) => ({ slug }));
}

export default async function SystemDesignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const slugs = await getContentSlugs("system-design");
  if (!slugs.includes(slug)) notFound();

  const doc = await loadMdxDoc("system-design", slug);

  return (
    <ArticleLayout
      title={doc.frontmatter.title ?? slug}
      description={doc.frontmatter.description}
    >
      {doc.body}
    </ArticleLayout>
  );
}
