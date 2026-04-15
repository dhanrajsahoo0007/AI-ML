import { getTopLevelMeta } from "@/lib/mdx-doc";
import { SectionIndex } from "@/components/section-index";
import { TopicCard } from "@/components/topic-card";

export const revalidate = 3600;

export default async function InterviewsIndexPage() {
  const meta = await getTopLevelMeta("interviews");

  return (
    <SectionIndex
      breadcrumbLabel="Interviews"
      title="Interview prep"
      subtitle="Collapsible Q&A blocks keep questions visible while hiding answers until you are ready."
    >
      {meta.map((m) => (
        <TopicCard
          key={m.slug}
          href={`/interviews/${m.slug}`}
          icon={m.icon}
          title={m.title}
          description={m.description ?? "Question-first drills."}
        />
      ))}
    </SectionIndex>
  );
}
