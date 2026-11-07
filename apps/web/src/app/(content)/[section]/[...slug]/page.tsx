import { SectionDocPage } from "@/components/section-doc-page";
import { docSlugParams, docsSection, type DocParams } from "@/features/docs/routes";
import { docPageSeo } from "@/features/seo/docs";
import { JsonLd } from "@/features/seo/json-ld-script";
import { withParentImages } from "@/features/seo/metadata";
import type { ResolvingMetadata } from "next";

export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { section: string } }) {
  return docSlugParams(params.section);
}

export async function generateMetadata({ params }: { params: DocParams }, parent: ResolvingMetadata) {
  const { section, slug } = await params;
  const seo = await docPageSeo(section, slug);
  return seo ? withParentImages(seo.metadata, parent) : {};
}

export default async function DocPage({ params }: { params: DocParams }) {
  const { section: param, slug } = await params;
  const section = docsSection(param);
  const seo = await docPageSeo(section.key, slug);
  return (
    <>
      {seo && <JsonLd data={seo.jsonLd} />}
      <SectionDocPage section={section.key} label={section.label} slug={slug} />
    </>
  );
}
