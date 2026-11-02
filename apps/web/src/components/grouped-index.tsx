import { getTopLevelMeta } from "@/lib/mdx-doc";
import { Breadcrumb } from "@/components/breadcrumb";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerChildren } from "@/components/motion/stagger-children";
import { Eyebrow, PageHeader } from "@/components/ui/editorial";
import { TopicCard } from "@/components/topic-card";
import type { ContentMeta, ContentSection } from "@/types/content";

const OTHER = "More topics";

// Section index whose top-level pages are grouped by their frontmatter `area`, in `areas` order.
export async function GroupedIndex({
  section,
  label,
  title,
  lead,
  areas,
  footer,
}: {
  section: ContentSection;
  label: string;
  title: string;
  lead: string;
  areas: string[];
  footer?: React.ReactNode;
}) {
  const meta = await getTopLevelMeta(section);

  const byArea = new Map<string, ContentMeta[]>();
  for (const m of meta) {
    const area = m.area && areas.includes(m.area) ? m.area : OTHER;
    byArea.set(area, [...(byArea.get(area) ?? []), m]);
  }
  const shown = [...areas, OTHER].filter((a) => byArea.has(a));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20 sm:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label }]} />

      <FadeIn>
        <PageHeader
          className="mt-10 mb-12 border-b border-hairline pb-12 sm:mb-16"
          title={title}
          lead={lead}
        />
      </FadeIn>

      <div className="space-y-16">
        {shown.map((area, i) => (
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
                  href={`/${section}/${m.slug}`}
                  icon={m.icon}
                  title={m.title}
                  description={m.description ?? ""}
                />
              ))}
            </StaggerChildren>
          </section>
        ))}
      </div>

      {footer && (
        <div className="mt-16 border-t border-hairline pt-6 text-xs leading-relaxed text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}
