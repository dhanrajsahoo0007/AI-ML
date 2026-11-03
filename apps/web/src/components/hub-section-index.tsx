import { getContentSlugs, getTopLevelMeta, partitionSlugs } from "@/lib/mdx-doc";
import { SectionIndex } from "@/components/section-index";
import { TopicCard } from "@/components/topic-card";
import type { ContentSection } from "@/types/content";

// Index page for sections built from hub files: one card per hub group, else one per hub.
export async function HubSectionIndex({
  section,
  label,
  title,
  subtitle,
}: {
  section: ContentSection;
  label: string;
  title: string;
  subtitle: string;
}) {
  const allSlugs = await getContentSlugs(section);
  const meta = await getTopLevelMeta(section);
  const { topLevel, children } = partitionSlugs(allSlugs);

  return (
    <SectionIndex breadcrumbLabel={label} title={title} subtitle={subtitle}>
      {meta.map((m) => m.slug).filter((s) => topLevel.includes(s)).flatMap((slug) => {
        const m = meta.find((x) => x.slug === slug);
        const childCount = (children[slug] ?? []).length;

        if (m?.groups && m.groups.length > 0) {
          return m.groups.map((g) => (
            <TopicCard
              key={`${slug}--${g.name}`}
              href={`/${section}/${slug}`}
              icon={g.icon ?? m.icon}
              title={g.name}
              description={m.description ?? "Architecture note."}
              childCount={
                childCount > 0
                  ? g.categories.length < (m.categories?.length ?? 0)
                    ? undefined
                    : childCount
                  : undefined
              }
              categories={g.categories}
            />
          ));
        }

        return (
          <TopicCard
            key={slug}
            href={`/${section}/${slug}`}
            icon={m?.icon}
            title={m?.title ?? slug.replaceAll("-", " ")}
            description={m?.description ?? "Architecture note."}
            childCount={childCount > 0 ? childCount : undefined}
            categories={m?.categories}
          />
        );
      })}
    </SectionIndex>
  );
}
