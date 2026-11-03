import { Hero } from "@/components/home/hero";
import { Workflow } from "@/components/home/workflow";
import { Features } from "@/components/home/features";
import { Stats } from "@/components/home/stats";
import { CtaBanner } from "@/components/home/cta-banner";
import { countWrittenArticles } from "@/lib/mdx-doc";
import { getCompanies, getQuestions } from "@/lib/question-bank";

export const revalidate = 3600;

export default async function HomePage() {
  const articles = await countWrittenArticles(["ai-system-design", "system-design"]);

  return (
    <>
      <Hero />
      <Workflow />
      <Features />
      <Stats
        questions={getQuestions().length}
        articles={articles}
        companies={getCompanies().length}
      />
      <CtaBanner />
    </>
  );
}
