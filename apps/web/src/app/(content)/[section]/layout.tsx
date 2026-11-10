import { ContentShell } from "@/components/content-shell";
import { EntitlementKeeper } from "@/features/entitlements/islands.client";
import { CompletedProvider } from "@/features/progress/completed-provider.client";
import { SpeculationRules } from "@/components/speculation-rules";
import { getSectionNav } from "@/lib/nav-tree";
import { docsSection, docsSectionParams, sectionRobots, type SectionParams } from "@/features/docs";

// Shared layout for every docs section (content/sections.yaml entries with kind: docs). The sidebar
// gets only this section's nav; speculation rules prefetch same-section links on hover.

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
  return (
    <>
      {/* Keeps a signed-in reader's entitlement cookie fresh; shows the payment-on-hold banner (plan §9.2, §9.3). */}
      <EntitlementKeeper />
      {/* Read ticks in the sidebar and "N read" on the section cards, from this browser's saved progress. */}
      <CompletedProvider>
        <ContentShell navTree={[nav]}>{children}</ContentShell>
      </CompletedProvider>
      <SpeculationRules sectionHref={section.href} />
    </>
  );
}
