import { notFound } from "next/navigation";
import { ArticleLayout } from "@/components/article-layout";
import { ProgressChecklist } from "@/components/progress-checklist";
import { getCatalog } from "@/lib/get-catalog";
import { getContentSlugs, loadMdxDoc } from "@/lib/mdx-doc";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getContentSlugs("learning-paths");
  return slugs.map((slug) => ({ slug }));
}

export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const slugs = await getContentSlugs("learning-paths");
  if (!slugs.includes(slug)) notFound();

  const doc = await loadMdxDoc("learning-paths", slug);

  let modules: { id: string; title: string; slug: string }[] = [];
  try {
    const catalog = await getCatalog();
    const path = catalog.find((p) => p.slug === slug);
    modules =
      path?.modules.map((m) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
      })) ?? [];
  } catch {
    /* CI / local without DB: still ship MDX */
    modules = [];
  }

  return (
    <div>
      <ProgressChecklist pathSlug={slug} modules={modules} />
      <ArticleLayout
        title={doc.frontmatter.title ?? slug}
        description={doc.frontmatter.description}
      >
        {doc.body}
      </ArticleLayout>
    </div>
  );
}
