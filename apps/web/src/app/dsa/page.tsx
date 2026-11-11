import Link from "next/link";
import type { ResolvingMetadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader } from "@/components/ui/editorial";
import {
  problemListHref,
  problemsForTopic,
  dsaContent,
  dsaSection,
  HUB_DESCRIPTION,
  HUB_TITLE,
  hubSeo,
} from "@/features/dsa";
import { withParentImages } from "@/features/seo/public";
import { JsonLd } from "@/features/seo";

export function generateMetadata(_props: unknown, parent: ResolvingMetadata) {
  return withParentImages(hubSeo(dsaSection()).metadata, parent);
}

// The hub: the topics with their problem counts and one link to the full, filterable list. Problems are not
// listed here; there are hundreds.
export default function DsaHubPage() {
  const { section, items, topics, problems } = dsaContent();
  const published = problems.filter((p) => p.fm.status === "published");
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-20 md:px-8">
      <JsonLd data={hubSeo(section).jsonLd} />
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: section.label }]} />
      <PageHeader className="mt-10 mb-12 border-b border-hairline pb-10" title={HUB_TITLE} lead={HUB_DESCRIPTION} />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">Topics</h2>
        <Link href={problemListHref(section)} className="text-sm font-semibold text-ink underline underline-offset-4">
          All {published.length} problems, with filters
        </Link>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {topics.map((t) => (
          <li key={t.slug} className="rounded-xl border border-hairline bg-paper p-5">
            <Link href={t.href} className="font-semibold text-ink underline-offset-4 hover:underline">
              {t.fm.title}
            </Link>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.fm.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">{problemsForTopic(items, t.slug).length} problems</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
