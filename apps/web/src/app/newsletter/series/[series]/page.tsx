import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { isPublished, loadIssues, NEWSLETTER_KIND, newsletterKind, seriesSeo } from "@/features/newsletter";
import { loadCatalog } from "@/features/newsletter/catalog";
import { IssueCard } from "@/features/newsletter/issue-card";
import { seriesIssues } from "@/features/newsletter/meta";
import { SignupBox } from "@/features/newsletter/public";
import { isRouteBuilt, routeSection, sectionOfKind } from "@/features/sections";
import { JsonLd } from "@/features/seo";

// A newsletter series (plan §3): its name and promise, then its issues in reading order. Only series with at least
// one issue built in this environment get a page; it is noindex until one of them is sent.

export const dynamicParams = false;

type Params = Promise<{ series: string }>;

export function generateStaticParams() {
  if (!isRouteBuilt(NEWSLETTER_KIND)) return [];
  const section = sectionOfKind(NEWSLETTER_KIND);
  const issues = loadIssues(section);
  return Object.keys(loadCatalog(section.key).series)
    .filter((key) => seriesIssues(issues, key).length > 0)
    .map((series) => ({ series }));
}

function findSeries(key: string) {
  const section = routeSection(NEWSLETTER_KIND);
  const meta = loadCatalog(section.key).series[key];
  const issues = seriesIssues(loadIssues(section), key);
  if (!meta || issues.length === 0) notFound();
  return { section, series: { key, ...meta }, issues, hasSent: issues.some(isPublished) };
}

export async function generateMetadata({ params }: { params: Params }) {
  const { section, series, hasSent } = findSeries((await params).series);
  return seriesSeo(section, series, hasSent).metadata;
}

export default async function NewsletterSeriesPage({ params }: { params: Params }) {
  const { section, series, issues, hasSent } = findSeries((await params).series);
  const premium = (i: (typeof issues)[number]) => newsletterKind.access(section, i) === "premium";
  const sent = issues.filter(isPublished).length;

  return (
    <div>
      <JsonLd data={seriesSeo(section, series, hasSent).jsonLd} />
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: section.label, href: section.href }, { label: series.title }]}
      />
      <header className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Newsletter series</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
            {series.title}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{series.description}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            {sent === 0 ? "First issue coming soon" : sent === 1 ? "1 issue so far" : `${sent} issues so far`} · read
            them in order
          </p>
        </div>
        <SignupBox source="archive" title="Get the next issue by email" />
      </header>

      <section aria-labelledby="series-issues" className="mt-16">
        <h2 id="series-issues" className="mb-6 font-display text-2xl tracking-tight text-ink">
          Issues in this series
        </h2>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((i) => (
            <li key={i.slug}>
              <IssueCard issue={i} sectionKey={section.key} premium={premium(i)} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
