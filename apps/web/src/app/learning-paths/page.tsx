import { getContentSlugs, getTopLevelMeta, partitionSlugs } from "@/lib/mdx-doc";
import { SectionIndex } from "@/components/section-index";
import { TopicCard } from "@/components/topic-card";

export const revalidate = 3600;

export default async function LearningPathsIndexPage() {
  const allSlugs = await getContentSlugs("learning-paths");
  const meta = await getTopLevelMeta("learning-paths");
  const { topLevel, children } = partitionSlugs(allSlugs);

  return (
    <SectionIndex
      breadcrumbLabel="Learning Paths"
      title="Learning paths"
      subtitle="Each path pairs long-form notes with modules you can track in the database-backed catalog."
    >
      {topLevel.map((slug) => {
        const m = meta.find((x) => x.slug === slug);
        const childCount = (children[slug] ?? []).length;
        return (
          <TopicCard
            key={slug}
            href={`/learning-paths/${slug}`}
            icon={m?.icon}
            title={m?.title ?? slug.replaceAll("-", " ")}
            description={m?.description ?? "Explore this learning path."}
            childCount={childCount > 0 ? childCount : undefined}
            categories={m?.categories}
          />
        );
      })}
    </SectionIndex>
  );
}
