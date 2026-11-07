import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/ui/editorial";
import { QuestionList } from "@/components/mdx/question-bank";
import { isRouteBuilt, routeSection } from "@/features/sections/route-helpers";
import { getCategories, getCategory, getQuestions } from "@/lib/question-bank";

export function generateStaticParams() {
  if (!isRouteBuilt("question-bank")) return [];
  return getCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const c = getCategory((await params).category);
  return c ? { title: `${c.title} interview questions`, description: c.description } : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  const section = routeSection("question-bank");
  const questions = getQuestions({ category: category.slug });
  const titles = new Map(category.subsections.map((s) => [s.slug, s.title]));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-20 md:px-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: section.label, href: section.href },
          { label: category.title },
        ]}
      />
      <FadeIn>
        <PageHeader
          className="mt-10 mb-10 border-b border-hairline pb-10"
          title={`${category.title} interview questions`}
          lead={category.description}
        />
      </FadeIn>

      {category.study.length > 0 && (
        <p className="mb-8 text-[15px] text-ink-2">
          <span className="text-muted-foreground">Study first: </span>
          {category.study.map((s, i) => (
            <span key={s.href}>
              {i > 0 && " · "}
              <Link href={s.href} className="text-primary underline underline-offset-2">
                {s.title}
              </Link>
            </span>
          ))}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {category.subsections.map((s) => (
          <Link
            key={s.slug}
            href={`/interviews/${category.slug}/${s.slug}`}
            className="group flex flex-col rounded-xl border border-hairline bg-paper p-5 transition-colors hover:border-ink/30"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-display text-lg leading-snug text-ink group-hover:text-primary">
                {s.title}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {getQuestions({ category: category.slug, subcategory: s.slug }).length}
              </span>
            </span>
            <span className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
              {s.description}
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-ink">
              Practice
              <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <QuestionList
        questions={questions}
        title={`All ${category.title} questions`}
        tagOf={(q) => titles.get(q.subcategory)!}
      />
    </div>
  );
}
