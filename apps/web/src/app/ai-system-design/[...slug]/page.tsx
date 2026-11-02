import { SectionDocPage } from "@/components/section-doc-page";
import { getContentSlugs } from "@/lib/mdx-doc";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getContentSlugs("ai-system-design");
  return slugs.map((slug) => ({ slug: slug.split("/") }));
}

export default async function AiSystemDesignPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return (
    <SectionDocPage section="ai-system-design" label="AI System Design" slug={slug} />
  );
}
