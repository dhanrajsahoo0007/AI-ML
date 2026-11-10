import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { FadeIn } from "@/components/motion/fade-in";
import { Eyebrow, PageHeader } from "@/components/ui/editorial";
import { getIconComponent } from "@/lib/icons";
import { routeSection } from "@/features/sections";
import { INTERVIEW_TRACKS } from "@/lib/interview-areas";
import { CATEGORY_GROUPS, getCategories, getQuestions, type Category } from "@/lib/question-bank";
import { listingPageSeo, JsonLd } from "@/features/seo";

function interviewsSeo() {
  const section = routeSection("question-bank");
  return listingPageSeo({
    kind: "question-bank",
    path: section.href,
    title: "AI and system design interview questions",
    description: `${getQuestions().length.toLocaleString("en-US")} AI and system design interview questions with clear answers, organized by topic and tagged with the companies reported to ask them.`,
    crumbs: [{ label: "Home", href: "/" }, { label: section.label }],
  });
}

// The social image comes from ./opengraph-image.tsx in this folder (Next merges it into this page).
export function generateMetadata() {
  return interviewsSeo().metadata;
}

function CategoryCard({ c, count }: { c: Category; count: (category: string, subcategory?: string) => number }) {
  const Icon = getIconComponent(c.icon);
  return (
    <div className="group flex h-full flex-col rounded-xl border border-hairline bg-paper p-6 transition-colors hover:border-ink/30 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-paper-2 text-primary">
          {Icon && <Icon aria-hidden className="size-5" />}
        </div>
        <span className="font-mono text-xs text-muted-foreground">{count(c.slug)} questions</span>
      </div>
      <h3 className="mt-6 font-display text-2xl leading-tight">
        <Link href={`/interviews/${c.slug}`} className="hover:text-primary">
          {c.title}
        </Link>
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{c.description}</p>
      <ul className="mt-5 flex flex-1 flex-wrap content-start gap-1.5">
        {/* A subsection with no question yet (new system design subsections fill in over time) is not listed. */}
        {c.subsections
          .filter((s) => count(c.slug, s.slug) > 0)
          .map((s) => (
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
        <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

export default function InterviewsIndexPage() {
  const section = routeSection("question-bank");
  const categories = getCategories();
  const total = getQuestions().length;
  const count = (category: string, subcategory?: string) => getQuestions({ category, subcategory }).length;
  // The two tracks, AI and ML first, each with its own count; a track with no visible category is left out.
  const tracks = INTERVIEW_TRACKS.map((t) => ({
    ...t,
    categories: categories.filter((c) => c.track === t.slug),
    total: getQuestions({ track: t.slug }).length,
  })).filter((t) => t.categories.length > 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20 sm:px-8">
      <JsonLd data={interviewsSeo().jsonLd} />
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: section.label }]} />

      <FadeIn>
        <PageHeader
          className="mt-10 mb-8 border-b border-hairline pb-12"
          title="Interview questions"
          lead={`${total.toLocaleString("en-US")} interview questions with clear answers in two tracks, AI and ML and system design, organized by topic and tagged with the companies reported to ask them. Filter by difficulty and company, search, and keep answers hidden until you are ready.`}
        />
      </FadeIn>

      {tracks.length > 1 && (
        <nav aria-label="Tracks" className="mb-12 grid gap-3 sm:mb-16 sm:grid-cols-2">
          {tracks.map((t) => (
            <a
              key={t.slug}
              href={`#${t.slug}`}
              className="group flex items-center justify-between gap-4 rounded-xl border border-hairline bg-paper-2/40 px-5 py-4 transition-colors hover:border-ink/30"
            >
              <span>
                <span className="block font-display text-xl text-ink group-hover:text-primary">{t.title}</span>
                <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                  {t.total.toLocaleString("en-US")} questions · {t.categories.length} topics
                </span>
              </span>
              <ArrowRight aria-hidden className="size-4 shrink-0 rotate-90 text-ink" />
            </a>
          ))}
        </nav>
      )}

      <div className="space-y-20">
        {tracks.map((t) => {
          const groups = CATEGORY_GROUPS.filter((g) => t.categories.some((c) => c.group === g));
          return (
            <section key={t.slug} id={t.slug} data-track={t.slug} className="scroll-mt-24">
              <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b border-ink pb-4">
                <div className="max-w-2xl">
                  <h2 className="font-display text-3xl leading-tight text-ink">{t.title}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{t.description}</p>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  <span data-track-count>{t.total.toLocaleString("en-US")}</span> questions
                </p>
              </div>
              <div className="space-y-14">
                {groups.map((group, i) => (
                  <div key={group}>
                    {/* A track with one area (system design) needs no area heading. */}
                    {groups.length > 1 && (
                      <Eyebrow index={String(i + 1).padStart(2, "0")} className="mb-6">
                        {group}
                      </Eyebrow>
                    )}
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {t.categories
                        .filter((c) => c.group === group)
                        .map((c) => (
                          <CategoryCard key={c.slug} c={c} count={count} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
