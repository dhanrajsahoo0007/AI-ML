import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/ui/editorial";
import { QuestionList } from "@/components/mdx/question-bank";
import { cn } from "@/lib/utils";
import { isRouteBuilt, routeSection } from "@/features/sections/route-helpers";
import { getCategories, getCategory, getQuestions } from "@/lib/question-bank";

type Params = Promise<{ category: string; subsection: string }>;

export function generateStaticParams() {
  if (!isRouteBuilt("question-bank")) return [];
  return getCategories().flatMap((c) =>
    c.subsections.map((s) => ({ category: c.slug, subsection: s.slug }))
  );
}

function resolve(categorySlug: string, subsectionSlug: string) {
  const category = getCategory(categorySlug);
  const subsection = category?.subsections.find((s) => s.slug === subsectionSlug);
  return category && subsection ? { category, subsection } : null;
}

export async function generateMetadata({ params }: { params: Params }) {
  const p = await params;
  const found = resolve(p.category, p.subsection);
  return found
    ? { title: `${found.subsection.title} interview questions`, description: found.subsection.description }
    : {};
}

export default async function SubsectionPage({ params }: { params: Params }) {
  const p = await params;
  const found = resolve(p.category, p.subsection);
  if (!found) notFound();
  const section = routeSection("question-bank");
  const { category, subsection } = found;
  const questions = getQuestions({ category: category.slug, subcategory: subsection.slug });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-20 md:px-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: section.label, href: section.href },
          { label: category.title, href: `/interviews/${category.slug}` },
          { label: subsection.title },
        ]}
      />
      <FadeIn>
        <PageHeader
          className="mt-10 mb-8 border-b border-hairline pb-10"
          title={subsection.title}
          lead={subsection.description}
        />
      </FadeIn>

      <nav aria-label={`${category.title} subsections`} className="flex flex-wrap gap-2">
        <Link
          href={`/interviews/${category.slug}`}
          className="rounded-full border border-hairline px-3 py-1 text-[13px] text-ink-2 hover:border-ink/40"
        >
          All {category.title}
        </Link>
        {category.subsections.map((s) => (
          <Link
            key={s.slug}
            href={`/interviews/${category.slug}/${s.slug}`}
            aria-current={s.slug === subsection.slug ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-[13px] transition-colors",
              s.slug === subsection.slug
                ? "border-ink bg-ink text-paper"
                : "border-hairline text-ink-2 hover:border-ink/40"
            )}
          >
            {s.title}
          </Link>
        ))}
      </nav>

      <QuestionList questions={questions} title={`${subsection.title} questions`} />
    </div>
  );
}
