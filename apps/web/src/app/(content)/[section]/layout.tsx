import { ContentShell } from "@/components/content-shell";
import { getSectionNav } from "@/lib/nav-tree";
import { docsSection, docsSectionParams, sectionRobots, type SectionParams } from "@/features/docs/routes";

// Shared layout for every docs section (content/sections.yaml entries with kind: docs). The sidebar
// gets only this section's nav.

export const dynamicParams = false;

export function generateStaticParams() {
  return docsSectionParams();
}

export async function generateMetadata({ params }: { params: SectionParams }) {
  const robots = sectionRobots(docsSection((await params).section));
  return robots ? { robots } : {};
}

export default async function DocsSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: SectionParams;
}) {
  const section = docsSection((await params).section);
  const nav = await getSectionNav(section.key);
  return <ContentShell navTree={[nav]}>{children}</ContentShell>;
}
