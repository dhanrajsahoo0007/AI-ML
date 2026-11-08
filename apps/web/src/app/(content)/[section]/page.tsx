import { HubSectionIndex } from "@/components/hub-section-index";
import { docsItems, docsSection, type SectionParams } from "@/features/docs";
import { docsSectionSeo, JsonLd } from "@/features/seo";

export const dynamicParams = false;

// The social image comes from ./opengraph-image.tsx in this folder (Next merges it into this page).
export async function generateMetadata({ params }: { params: SectionParams }) {
  return docsSectionSeo((await params).section)?.metadata ?? {};
}

export default async function DocsSectionIndexPage({ params }: { params: SectionParams }) {
  const section = docsSection((await params).section);
  const seo = docsSectionSeo(section.key);
  return (
    <>
      {seo && <JsonLd data={seo.jsonLd} />}
      <HubSectionIndex section={section} items={await docsItems(section)} />
    </>
  );
}
