import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/ui/editorial";
import { QuestionList } from "@/components/mdx/question-bank";
import { Paywall } from "@/features/paywall/paywall";
import { routeSection } from "@/features/sections/route-helpers";
import { JsonLd } from "@/features/seo/json-ld-script";
import { listingPageSeo } from "@/features/seo/pages";
import { getCategory, getQuestions, type Category } from "@/lib/question-bank";

// An Interview Practice category page. For a category whose answers are premium (plan §9.1) the page is built
// twice: the full page (middleware serves it only with Pro) and its public preview, where every answer is
// replaced by a placeholder and the page ends with the paywall.

export function categorySeo(slug: string) {
  const c = getCategory(slug);
  if (!c) return null;
  const section = routeSection("question-bank");
  return listingPageSeo({
    kind: "question-bank",
    image: { path: `${section.href}/opengraph-image`, alt: section.label },
    path: `${section.href}/${c.slug}`,
    title: `${c.title} interview questions`,
    description: c.description,
    crumbs: [{ label: "Home", href: "/" }, { label: section.label, href: section.href }, { label: c.title }],
  });
}

export function CategoryView({ category, preview = false }: { category: Category; preview?: boolean }) {
  const section = routeSection("question-bank");
  const questions = getQuestions({ category: category.slug });
  const titles = new Map(category.subsections.map((s) => [s.slug, s.title]));
  const seo = categorySeo(category.slug);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-20 md:px-8">
      {seo && <JsonLd data={seo.jsonLd} />}
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
        locked={preview ? () => true : undefined}
      />
      {preview && <Paywall path={`${section.href}/${category.slug}`} what="set of answers" />}
    </div>
  );
}
