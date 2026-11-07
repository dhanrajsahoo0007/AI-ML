import { docsSection, docsSectionParams } from "@/features/docs/routes";
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/features/seo/og-image";

// Social card for a docs section and every page in it, with the section's title (rendered once at build).
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Section of the site";

export const dynamicParams = false;

export function generateStaticParams() {
  return docsSectionParams();
}

export default async function SectionOpengraphImage({ params }: { params: Promise<{ section: string }> }) {
  const section = docsSection((await params).section);
  return ogImage({ title: section.hub?.title ?? section.label, subtitle: section.hub?.subtitle });
}
