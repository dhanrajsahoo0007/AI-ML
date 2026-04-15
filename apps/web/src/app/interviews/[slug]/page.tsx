import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ArticleLayout } from "@/components/article-layout";
import { getContentSlugs, loadMdxDoc } from "@/lib/mdx-doc";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getContentSlugs("interviews");
  return slugs.map((slug) => ({ slug }));
}

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const slugs = await getContentSlugs("interviews");
  if (!slugs.includes(slug)) notFound();

  const doc = await loadMdxDoc("interviews", slug);

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Interviews", href: "/interviews" },
    { label: doc.frontmatter.title ?? slug },
  ];

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 pt-6 md:px-8">
        <Breadcrumb items={crumbs} />
      </div>
      <ArticleLayout
        title={doc.frontmatter.title ?? slug}
        description={doc.frontmatter.description}
      >
        {doc.body}
      </ArticleLayout>
    </div>
  );
}
