import { SectionIndex } from "@/components/section-index";
import { TopicCard } from "@/components/topic-card";
import { docGroupSchema, type SectionDef } from "@/features/sections";
import { articlesOf, hubsOf, sectionGroups, type DocItem } from "@/features/docs";

// Index page of a docs section: one card per section group (sections.yaml `groups`, in reading order) when the
// section sets them, else one per hub group, else one per hub. Title, subtitle and breadcrumb label come from the
// section's registry entry.
export function HubSectionIndex({ section, items }: { section: SectionDef; items: DocItem[] }) {
  const hub = section.hub ?? { title: section.label, subtitle: "" };
  const own = sectionGroups(section, items);
  if (own.length > 0) {
    return (
      <SectionIndex breadcrumbLabel={section.label} title={hub.title} subtitle={hub.subtitle}>
        {own.map((g, i) => (
          <TopicCard
            key={g.slug}
            href={g.href}
            icon={g.icon}
            step={i + 1}
            title={g.name}
            description={g.description ?? hub.subtitle}
            childCount={g.count}
            tone={g.tone}
            hrefs={g.categories.flatMap((c) => c.items.map((item) => item.href))}
            categories={g.categories.map((c) => c.title)}
          />
        ))}
      </SectionIndex>
    );
  }
  return (
    <SectionIndex breadcrumbLabel={section.label} title={hub.title} subtitle={hub.subtitle}>
      {hubsOf(items).flatMap((h) => {
        const articles = articlesOf(items, h.slug);
        const childCount = articles.length;
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
            hrefs={articles.map((a) => a.href)}
          />
        );
      })}
    </SectionIndex>
  );
}
