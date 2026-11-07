import { SectionIndex } from "@/components/section-index";
import { TopicCard } from "@/components/topic-card";
import { docGroupSchema, type SectionDef } from "@/features/sections/schema";
import { articlesOf, hubsOf, type DocItem } from "@/features/docs/source";

// Index page of a docs section: one card per hub group, else one per hub. Title, subtitle and
// breadcrumb label come from the section's registry entry.
export function HubSectionIndex({ section, items }: { section: SectionDef; items: DocItem[] }) {
  const hub = section.hub ?? { title: section.label, subtitle: "" };
  return (
    <SectionIndex breadcrumbLabel={section.label} title={hub.title} subtitle={hub.subtitle}>
      {hubsOf(items).flatMap((h) => {
        const childCount = articlesOf(items, h.slug).length;
        const categories = Array.isArray(h.data.categories) ? (h.data.categories as string[]) : undefined;
        const groups = docGroupSchema.array().safeParse(h.data.groups);
        const description = h.description ?? "Architecture note.";

        if (groups.success && groups.data.length > 0) {
          return groups.data.map((g) => (
            <TopicCard
              key={`${h.slug}--${g.name}`}
              href={h.href}
              icon={g.icon ?? h.icon}
              title={g.name}
              description={description}
              childCount={
                childCount > 0 ? (g.categories.length < (categories?.length ?? 0) ? undefined : childCount) : undefined
              }
              categories={g.categories}
            />
          ));
        }

        return (
          <TopicCard
            key={h.slug}
            href={h.href}
            icon={h.icon}
            title={h.title}
            description={description}
            childCount={childCount > 0 ? childCount : undefined}
            categories={categories}
          />
        );
      })}
    </SectionIndex>
  );
}
