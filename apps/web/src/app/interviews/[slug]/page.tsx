import { notFound } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArticleLayout } from "@/components/article-layout";
import { getContentSlugs, loadMdxDoc } from "@/lib/mdx-doc";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getContentSlugs("interviews");
  return slugs.map((slug) => ({ slug }));
}

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const slugs = await getContentSlugs("interviews");
  if (!slugs.includes(slug)) notFound();

  const doc = await loadMdxDoc("interviews", slug);

  return (
    <div className="space-y-8">
      <section className="not-prose rounded-lg border border-dashed border-border/70 bg-muted/30 p-4">
        <h2 className="text-sm font-semibold tracking-tight">Accordion drill</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the component below for quick recall; the MDX page keeps the same
          questions with native collapses for zero JavaScript.
        </p>
        <Accordion className="mt-4 w-full">
          <AccordionItem value="one">
            <AccordionTrigger>How do you structure a take-home answer?</AccordionTrigger>
            <AccordionContent>
              Clarify requirements, propose metrics, sketch architecture, call out
              tradeoffs, and end with tests, rollout, and observability.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="two">
            <AccordionTrigger>What signals a strong ML system design interview?</AccordionTrigger>
            <AccordionContent>
              Explicit data contracts, offline vs online paths, failure handling,
              cost controls, and iterative delivery—not just model choice.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <ArticleLayout
        title={doc.frontmatter.title ?? slug}
        description={doc.frontmatter.description}
      >
        {doc.body}
      </ArticleLayout>
    </div>
  );
}
