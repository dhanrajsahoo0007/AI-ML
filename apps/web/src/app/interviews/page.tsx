import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { FadeIn } from "@/components/motion/fade-in";
import { Eyebrow, PageHeader } from "@/components/ui/editorial";
import { getIconComponent } from "@/lib/icons";
import { routeSection } from "@/features/sections/route-helpers";
import { CATEGORY_GROUPS, getCategories, getQuestions } from "@/lib/question-bank";

export default function InterviewsIndexPage() {
  const section = routeSection("question-bank");
  const categories = getCategories();
  const total = getQuestions().length;
  const count = (category: string, subcategory?: string) =>
    getQuestions({ category, subcategory }).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20 sm:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: section.label }]} />

      <FadeIn>
        <PageHeader
          className="mt-10 mb-12 border-b border-hairline pb-12 sm:mb-16"
          title="Interview questions"
          lead={`${total.toLocaleString("en-US")} AI interview questions with clear answers, organized by topic and subtopic and tagged with the companies reported to ask them. Filter by difficulty and company, search, and keep answers hidden until you are ready.`}
        />
      </FadeIn>

      <div className="space-y-16">
        {CATEGORY_GROUPS.filter((g) => categories.some((c) => c.group === g)).map((group, i) => (
          <section key={group}>
            <Eyebrow index={String(i + 1).padStart(2, "0")} className="mb-6">
              {group}
            </Eyebrow>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categories
                .filter((c) => c.group === group)
                .map((c) => {
                  const Icon = getIconComponent(c.icon);
                  return (
                    <div
                      key={c.slug}
                      className="group flex h-full flex-col rounded-xl border border-hairline bg-paper p-6 transition-colors hover:border-ink/30 sm:p-7"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-paper-2 text-primary">
                          {Icon && <Icon aria-hidden className="size-5" />}
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {count(c.slug)} questions
                        </span>
                      </div>
                      <h2 className="mt-6 font-display text-2xl leading-tight">
                        <Link href={`/interviews/${c.slug}`} className="hover:text-primary">
                          {c.title}
                        </Link>
                      </h2>
                      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                        {c.description}
                      </p>
                      <ul className="mt-5 flex flex-1 flex-wrap content-start gap-1.5">
                        {c.subsections.map((s) => (
                          <li key={s.slug}>
                            <Link
                              href={`/interviews/${c.slug}/${s.slug}`}
                              className="inline-flex rounded-full border border-hairline px-2.5 py-0.5 text-xs text-ink-2 transition-colors hover:border-ink/40 hover:text-ink"
                            >
                              {s.title}
                              <span className="ml-1.5 opacity-60">{count(c.slug, s.slug)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/interviews/${c.slug}`}
                        className="mt-6 flex items-center justify-between border-t border-hairline pt-5 text-sm font-medium text-ink"
                      >
                        Practice {c.title}
                        <ArrowRight
                          aria-hidden
                          className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                        />
                      </Link>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
