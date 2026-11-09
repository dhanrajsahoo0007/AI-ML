import { Rss } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  ARCHIVE_TITLE,
  archiveSeo,
  isBuilt,
  isPublished,
  loadIssues,
  NEWSLETTER_KIND,
  NEWSLETTER_NAME,
  NEWSLETTER_PROMISE,
  newsletterKind,
} from "@/features/newsletter";
import { ArchiveGrid } from "@/features/newsletter/archive-grid.client";
import { IssueCard } from "@/features/newsletter/issue-card";
import { issueLabels } from "@/features/newsletter/meta";
import { SignupBox } from "@/features/newsletter/public";
import { routeSection } from "@/features/sections";
import { JsonLd } from "@/features/seo";

// The newsletter archive (plan §3): masthead and sign-up, the newest issue as a large card, then every issue as a
// cover card, filterable by topic.

export const dynamic = "force-static";

export function generateMetadata() {
  return archiveSeo(routeSection(NEWSLETTER_KIND)).metadata;
}

export default function NewsletterArchivePage() {
  const section = routeSection(NEWSLETTER_KIND);
  const issues = loadIssues(section).filter((i) => isBuilt(i));
  const sent = issues.filter(isPublished);
  const [featured, ...rest] = issues;
  const premium = (i: (typeof issues)[number]) => newsletterKind.access(section, i) === "premium";
  const tags = new Map<string, string>();
  for (const i of issues) for (const t of issueLabels(section.key, i).tags) tags.set(t.key, t.label);

  return (
    <div>
      <JsonLd data={archiveSeo(section).jsonLd} />
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: section.label }]} />

      <header className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">{ARCHIVE_TITLE}</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
            {NEWSLETTER_NAME}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{NEWSLETTER_PROMISE}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            {sent.length === 0
              ? "First issue coming soon"
              : sent.length === 1
                ? "1 issue so far"
                : `${sent.length} issues so far`}{" "}
            · free to read ·{" "}
            <a href={`${section.href}/rss.xml`} className="inline-flex items-center gap-1 text-primary hover:underline">
              <Rss aria-hidden className="size-3.5" /> RSS
            </a>
          </p>
        </div>
        <SignupBox source="archive" title="Get the next issue by email" />
      </header>

      {featured ? (
        <>
          <section aria-labelledby="latest" className="mt-16">
            <h2 id="latest" className="sr-only">
              Latest issue
            </h2>
            <IssueCard issue={featured} sectionKey={section.key} featured isNew premium={premium(featured)} />
          </section>
          {rest.length > 0 && (
            <section aria-labelledby="archive" className="mt-16">
              <h2 id="archive" className="mb-6 font-display text-2xl tracking-tight text-ink">
                Past issues
              </h2>
              <ArchiveGrid
                tags={[...tags].map(([key, label]) => ({ key, label }))}
                items={rest.map((i) => ({
                  slug: i.slug,
                  tags: i.tags,
                  card: <IssueCard issue={i} sectionKey={section.key} premium={premium(i)} />,
                }))}
              />
            </section>
          )}
        </>
      ) : (
        <p className="mt-16 text-[15px] text-muted-foreground">The first issue is on its way.</p>
      )}
    </div>
  );
}
