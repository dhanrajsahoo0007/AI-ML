import { SectionDocPage } from "@/components/section-doc-page";
import { docSlugParams, docsSection, type DocParams } from "@/features/docs/routes";

export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { section: string } }) {
  return docSlugParams(params.section);
}

export default async function DocPage({ params }: { params: DocParams }) {
  const { section: param, slug } = await params;
  const section = docsSection(param);
  return <SectionDocPage section={section.key} label={section.label} slug={slug} />;
}
