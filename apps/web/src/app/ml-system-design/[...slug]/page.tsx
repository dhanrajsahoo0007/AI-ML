import { notFound } from "next/navigation";
import { SectionDocPage } from "@/components/section-doc-page";
import { isSectionEnabled } from "@/config/features";
import { getContentSlugs } from "@/lib/mdx-doc";

export const revalidate = 3600;

export async function generateStaticParams() {
  if (!isSectionEnabled("ml-system-design")) return [];
  const slugs = await getContentSlugs("ml-system-design");
  return slugs.map((slug) => ({ slug: slug.split("/") }));
}

export default async function MlSystemDesignPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  if (!isSectionEnabled("ml-system-design")) notFound();
  const { slug } = await params;
  return <SectionDocPage section="ml-system-design" label="ML System Design" slug={slug} />;
}
