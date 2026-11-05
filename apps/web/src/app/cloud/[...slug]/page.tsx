import { notFound } from "next/navigation";
import { SectionDocPage } from "@/components/section-doc-page";
import { isSectionEnabled } from "@/config/features";
import { getContentSlugs } from "@/lib/mdx-doc";

export const revalidate = 3600;

export async function generateStaticParams() {
  if (!isSectionEnabled("cloud")) return [];
  const slugs = await getContentSlugs("cloud");
  return slugs.map((slug) => ({ slug: slug.split("/") }));
}

export default async function CloudPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  if (!isSectionEnabled("cloud")) notFound();
  const { slug } = await params;
  return <SectionDocPage section="cloud" label="Cloud Architecture" slug={slug} />;
}
