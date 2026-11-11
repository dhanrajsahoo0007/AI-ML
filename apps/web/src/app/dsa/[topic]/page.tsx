import Link from "next/link";
import type { ResolvingMetadata } from "next";
import { ArticleLayout } from "@/components/article-layout";
import { Breadcrumb } from "@/components/breadcrumb";
import { getUpdatedDate } from "@/lib/doc-meta";
import { loadMdxDoc } from "@/lib/mdx-doc";
import {
  DifficultyLabel,
  getTopic,
  practiceGroups,
  topicParams,
  type TopicParams,
  hubCrumbs,
  topicSeo,
  TOPICS_DIR,
} from "@/features/dsa";
import { withParentImages } from "@/features/seo/public";
import { JsonLd } from "@/features/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return topicParams();
}

export async function generateMetadata({ params }: { params: TopicParams }, parent: ResolvingMetadata) {
  const { section, topic } = getTopic((await params).topic);
  return withParentImages((await topicSeo(section, topic)).metadata, parent);
}

// A topic article, compiled with the same MDX pipeline as docs articles, then the problems that use it, grouped
// by pattern.
export default async function TopicPage({ params }: { params: TopicParams }) {
  const { section, topic, problems, topicOutlines } = getTopic((await params).topic);
  const doc = await loadMdxDoc(section.key, [TOPICS_DIR, topic.slug]);
  const seo = await topicSeo(section, topic);
  return (
    <div>
      <JsonLd data={seo.jsonLd} />
      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-8">
        <Breadcrumb items={[...hubCrumbs(section), { label: topic.fm.title }]} />
      </div>
      <ArticleLayout
        title={topic.fm.title}
        description={topic.fm.description}
        docs={{
          headings: doc.headings,
          updated: await getUpdatedDate(topic.file, topic.fm.updated),
          pagePath: topic.href,
        }}
      >
        {doc.body}
        {problems.length > 0 && (
          <>
            <h2 id="practice">Practice problems</h2>
            {practiceGroups(section, problems).map((g) => (
              <section key={g.slug} aria-labelledby={`practice-${g.slug}`}>
                <h3 id={`practice-${g.slug}`}>{g.label}</h3>
                <ul>
                  {g.problems.map((p) => (
                    <li key={p.slug}>
                      <Link href={p.href} prefetch={false}>
                        {p.fm.title}
                      </Link>{" "}
                      · <DifficultyLabel difficulty={p.fm.difficulty} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
        {topicOutlines.length > 0 && (
          <>
            <h2 id="outlines">More problems in this topic</h2>
            {outlineGroups(topicOutlines).map(([group, list]) => (
              <section key={group} aria-label={group}>
                <h3>{group}</h3>
                <ul>
                  {list.map((o) => (
                    <li key={o.slug}>
                      <Link href={o.href} prefetch={false}>
                        {o.fm.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </ArticleLayout>
    </div>
  );
}

/** Outlines under their `group` heading, groups in the order their first outline appears. */
function outlineGroups<T extends { fm: { group?: string } }>(outlines: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const o of outlines) groups.set(o.fm.group ?? "Other", [...(groups.get(o.fm.group ?? "Other") ?? []), o]);
  return [...groups];
}
