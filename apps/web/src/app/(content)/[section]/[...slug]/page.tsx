import { docSlugParams, docsSection, docVariant, type DocParams } from "@/features/docs";
// By path: the view is JSX and features/docs/index.ts is loaded by plain Node (see the index).
import { SectionDocPage } from "@/features/docs/section-doc-page";
import { docPageSeo, JsonLd } from "@/features/seo";
import { withParentImages } from "@/features/seo/public";
import type { ResolvingMetadata } from "next";

export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { section: string } }) {
  return docSlugParams(params.section);
}

// `<page>/_preview` is the public preview of a premium page (plan §9.2): same metadata and canonical URL as the
// page itself, because middleware serves it at that URL to visitors without Pro.
export async function generateMetadata({ params }: { params: DocParams }, parent: ResolvingMetadata) {
  const { section, slug: raw } = await params;
  const { slug } = docVariant(raw);
  const seo = await docPageSeo(section, slug);
  return seo ? withParentImages(seo.metadata, parent) : {};
}

export default async function DocPage({ params }: { params: DocParams }) {
  const { section: param, slug: raw } = await params;
  const section = docsSection(param);
  const { slug, preview } = docVariant(raw);
  const seo = await docPageSeo(section.key, slug);
  return (
    <>
      {seo && <JsonLd data={seo.jsonLd} />}
      <SectionDocPage section={section.key} label={section.label} slug={slug} preview={preview} />
    </>
  );
}
