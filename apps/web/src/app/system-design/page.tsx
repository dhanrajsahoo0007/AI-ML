import { getContentSlugs, getTopLevelMeta, partitionSlugs } from "@/lib/mdx-doc";
import { SectionIndex } from "@/components/section-index";
import { TopicCard } from "@/components/topic-card";

export const revalidate = 3600;

export default async function SystemDesignIndexPage() {
  const allSlugs = await getContentSlugs("system-design");
  const meta = await getTopLevelMeta("system-design");
  const { topLevel, children } = partitionSlugs(allSlugs);

  return (
    <SectionIndex
      breadcrumbLabel="ML System Design"
      title="ML system design"
      subtitle="Architecture notes focused on reliability, data movement, and the interfaces between research and production."
    >
      {topLevel.flatMap((slug) => {
        const m = meta.find((x) => x.slug === slug);
        const childCount = (children[slug] ?? []).length;

        if (m?.groups && m.groups.length > 0) {
          return m.groups.map((g) => (
            <TopicCard
              key={`${slug}--${g.name}`}
              href={`/system-design/${slug}`}
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
            href={`/system-design/${slug}`}
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
