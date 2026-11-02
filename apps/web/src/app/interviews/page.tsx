import { getTopLevelMeta } from "@/lib/mdx-doc";
import { Breadcrumb } from "@/components/breadcrumb";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerChildren } from "@/components/motion/stagger-children";
import { Eyebrow, PageHeader } from "@/components/ui/editorial";
import { TopicCard } from "@/components/topic-card";
import type { ContentMeta } from "@/types/content";

export const revalidate = 3600;

// Question banks are grouped by their frontmatter `area`, in this order.
const AREAS = ["ML & AI", "Data Science", "Production & Career"];
const OTHER = "More topics";

export default async function InterviewsIndexPage() {
  const meta = await getTopLevelMeta("interviews");

  const byArea = new Map<string, ContentMeta[]>();
  for (const m of meta) {
    const area = m.area && AREAS.includes(m.area) ? m.area : OTHER;
    byArea.set(area, [...(byArea.get(area) ?? []), m]);
  }
  const areas = [...AREAS, OTHER].filter((a) => byArea.has(a));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20 sm:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Interviews" }]} />

      <FadeIn>
        <PageHeader
          className="mt-10 mb-12 border-b border-hairline pb-12 sm:mb-16"
          title="Interview question banks"
          lead="Hundreds of AI, data science and ML interview questions with clear answers. Filter by topic and difficulty, or search, and keep answers hidden until you are ready."
        />
      </FadeIn>

      <div className="space-y-16">
        {areas.map((area, i) => (
          <section key={area}>
            <Eyebrow index={String(i + 1).padStart(2, "0")} className="mb-6">
              {area}
            </Eyebrow>
            <StaggerChildren
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              itemClassName="h-full"
            >
              {byArea.get(area)!.map((m) => (
                <TopicCard
                  key={m.slug}
                  href={`/interviews/${m.slug}`}
                  icon={m.icon}
                  title={m.title}
                  description={m.description ?? "Question-first drills."}
                />
              ))}
            </StaggerChildren>
          </section>
        ))}
      </div>
    </div>
  );
}
