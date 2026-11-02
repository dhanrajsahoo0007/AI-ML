import { Hero } from "@/components/home/hero";
import { Workflow } from "@/components/home/workflow";
import { Features } from "@/components/home/features";
import { Stats } from "@/components/home/stats";
import { CtaBanner } from "@/components/home/cta-banner";
import { getCatalog } from "@/lib/get-catalog";
import { getContentSlugs } from "@/lib/mdx-doc";
import { getCategories } from "@/lib/question-bank";
import type { ContentSection } from "@/types/content";

export const revalidate = 60;

export default async function HomePage() {
  let catalogCount = 0;
  let pathCount = 0;
  try {
    const catalog = await getCatalog();
    catalogCount = catalog.reduce((n, p) => n + p.modules.length, 0);
    pathCount = catalog.length;
  } catch {
    catalogCount = 0;
    pathCount = 5;
  }

  const sections: ContentSection[] = [
    "learning-paths",
    "system-design",
    "ai-system-design",
  ];
  const slugCounts = await Promise.all(
    sections.map((s) => getContentSlugs(s).then((arr) => arr.length))
  );
  const interviewTopics = getCategories().reduce((n, c) => n + c.subsections.length, 0);
  const totalTopics = slugCounts.reduce((a, b) => a + b, interviewTopics);

  return (
    <>
      <Hero />
      <Workflow />
      <Features />
      <Stats modules={catalogCount} paths={pathCount} topics={totalTopics} />
      <CtaBanner />
    </>
  );
}
