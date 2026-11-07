import { Hero } from "@/components/home/hero";
import { Workflow } from "@/components/home/workflow";
import { Features } from "@/components/home/features";
import { Stats } from "@/components/home/stats";
import { CtaBanner } from "@/components/home/cta-banner";
import { visibleSections } from "@/features/sections/registry";
import { loadSection } from "@/features/sections/kinds";
import type { SectionKindName } from "@/features/sections/schema";

export default async function HomePage() {
  // Stats count only `on` sections, each through its kind's counts().
  const loaded = await Promise.all(visibleSections().map(loadSection));
  const written = (kind: SectionKindName) =>
    loaded
      .filter((l) => l.section.kind === kind)
      .reduce((n, l) => n + l.kind.counts(l.items).written, 0);

  return (
    <>
      <Hero />
      <Workflow />
      <Features />
      <Stats questions={written("question-bank")} articles={written("docs")} companies={written("directory")} />
      <CtaBanner />
    </>
  );
}
