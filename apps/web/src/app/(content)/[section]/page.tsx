import { HubSectionIndex } from "@/components/hub-section-index";
import { docsItems, docsSection, type SectionParams } from "@/features/docs/routes";

export const dynamicParams = false;

export default async function DocsSectionIndexPage({ params }: { params: SectionParams }) {
  const section = docsSection((await params).section);
  return <HubSectionIndex section={section} items={await docsItems(section)} />;
}
