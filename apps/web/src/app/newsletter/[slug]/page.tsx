import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { OnThisPage, OnThisPageMobile } from "@/components/article/on-this-page";
import { Breadcrumb } from "@/components/breadcrumb";
import { TopicCard } from "@/components/topic-card";
import { isBuilt, isPublished, issueSeo, loadIssues, NEWSLETTER_KIND, newsletterKind } from "@/features/newsletter";
import { seriesHref } from "@/features/newsletter/catalog";
import { CoverPlaceholder, IssueCover } from "@/features/newsletter/cover/issue-cover";
import { issueBody } from "@/features/newsletter/issue-body";
import { formatIssueDate, issueLabels, LEVEL_LABEL, neighbours, relatedArticles } from "@/features/newsletter/meta";
import { SignupBox } from "@/features/newsletter/public";
import { isRouteBuilt, routeSection, sectionOfKind } from "@/features/sections";
import { absoluteUrl, PAYWALL_CONTAINER_CLASS } from "@/features/seo/public";
import { JsonLd } from "@/features/seo";

// The web version of one issue (plan §3): cover, the "In 30 seconds" takeaways, the body with an outline rail,
// articles to go deeper, and the neighbouring issues. Premium issues show the summary and a Pro placeholder inside
// the paywall container; their body is never rendered here (it reaches entitled readers through the §9.2 gate).

export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  if (!isRouteBuilt(NEWSLETTER_KIND)) return [];
  const section = sectionOfKind(NEWSLETTER_KIND);
  return newsletterKind.staticParams(section, loadIssues(section));
}

function findIssue(slug: string) {
  const section = routeSection(NEWSLETTER_KIND);
  const issues = loadIssues(section);
  const issue = issues.find((i) => i.slug === slug && isBuilt(i));
  if (!issue) notFound();
  return { section, issue, issues };
}

// The metadata names the issue's own share image, so the parent's (the site card) is not carried down.
export async function generateMetadata({ params }: { params: Params }) {
  const { section, issue } = findIssue((await params).slug);
  return issueSeo(section, issue).metadata;
}

export default async function NewsletterIssuePage({ params }: { params: Params }) {
  const { section, issue, issues } = findIssue((await params).slug);
  const premium = newsletterKind.access(section, issue) === "premium";
  const { series, tags } = issueLabels(section.key, issue);
  const body = premium ? null : await issueBody(issue);
  const related = relatedArticles(issue.related);
  const { newer, older } = neighbours(issues, issue.slug);
  const url = absoluteUrl(issue.href);
  const number = issue.number !== undefined ? `Issue #${issue.number}` : undefined;

  return (
    <article>
      <JsonLd data={issueSeo(section, issue).jsonLd} />
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: section.label, href: section.href }, { label: issue.title }]}
      />
      {!isPublished(issue) && (
        <p
          role="note"
          className="mt-6 rounded-xl border border-hairline bg-paper-2/60 px-4 py-3 text-sm text-muted-foreground"
        >
          {issue.status === "scheduled" ? "Scheduled" : "Draft"}: this issue hasn&apos;t been sent yet. Its page is
          built for review only and is not indexed.
        </p>
      )}

      {issue.cover ? (
        <IssueCover
          cover={issue.cover}
          variant="hero"
          id={issue.slug}
          className="mt-8 aspect-[16/9] max-h-[460px] w-full rounded-3xl border border-hairline sm:aspect-[21/9]"
        />
      ) : (
        <CoverPlaceholder className="mt-8 aspect-[21/9] max-h-[460px] w-full rounded-3xl" />
      )}

      <div className="mx-auto mt-10 grid max-w-[1080px] gap-12 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 max-w-[72ch]">
          <header>
            {(number || series) && (
              <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">
                {number}
                {number && series && " · "}
                {series && issue.series && (
                  <Link href={seriesHref(section.href, issue.series)} className="hover:underline">
                    {series}
                  </Link>
                )}
              </p>
            )}
            <h1 className="mt-3 font-display text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
              {issue.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{issue.summary}</p>
            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <time dateTime={issue.date}>{formatIssueDate(issue.date)}</time>
              <span aria-hidden>·</span>
              <span>{issue.readingTime} min read</span>
              {issue.level && (
                <>
                  <span aria-hidden>·</span>
                  <span>{LEVEL_LABEL[issue.level]}</span>
                </>
              )}
              {tags.map((t) => (
                <span key={t.key} className="rounded-full border border-hairline px-2.5 py-0.5 text-xs text-ink-2">
                  {t.label}
                </span>
              ))}
            </p>
          </header>

          {issue.takeaways.length > 0 && (
            <aside
              aria-labelledby="in-30-seconds"
              className="mt-10 rounded-2xl border border-primary/25 bg-accent-soft/60 p-6 sm:p-7"
            >
              <h2
                id="in-30-seconds"
                className="flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-primary uppercase"
              >
                <Sparkles aria-hidden className="size-4" /> In 30 seconds
              </h2>
              <ul className="mt-4 space-y-3">
                {issue.takeaways.map((t) => (
                  <li key={t} className="flex gap-3 text-[16px] leading-relaxed text-ink">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <div className="mt-12">
            {premium || !body ? (
              <div className={`${PAYWALL_CONTAINER_CLASS} rounded-2xl border border-hairline bg-paper-2/60 p-6 sm:p-8`}>
                <p className="font-display text-xl text-ink">This issue is for Pro members</p>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  Pro unlocks every premium article and newsletter issue.{" "}
                  <Link href="/pricing" className="text-primary underline">
                    See plans
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <>
                <div className="xl:hidden">
                  <OnThisPageMobile headings={body.headings} />
                </div>
                <div className="prose-editorial [&_:is(h2,h3)]:scroll-mt-24">{body.content}</div>
              </>
            )}
          </div>

          {related.length > 0 && (
            <section aria-labelledby="go-deeper-on-the-site" className="mt-16">
              <h2 id="go-deeper-on-the-site" className="font-display text-2xl tracking-tight text-ink">
                Read more on the site
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {related.map((r) => (
                  <TopicCard
                    key={r.href}
                    href={r.href}
                    icon={r.icon}
                    title={r.title}
                    description={r.description ?? ""}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="mt-14 flex flex-wrap items-center gap-3 border-t border-hairline pt-6 text-sm">
            <span className="text-muted-foreground">Share this issue:</span>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-hairline px-3 py-1 text-ink-2 hover:border-ink/40"
            >
              LinkedIn
            </a>
            <a
              href={`https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(issue.title)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-hairline px-3 py-1 text-ink-2 hover:border-ink/40"
            >
              X
            </a>
          </div>

          {(older || newer) && (
            <nav aria-label="More issues" className="mt-10 grid gap-4 sm:grid-cols-2">
              {older ? (
                <Link href={older.href} className="group rounded-2xl border border-hairline p-5 hover:border-ink/30">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowLeft aria-hidden className="size-3.5" /> Previous issue
                  </span>
                  <span className="mt-1.5 block font-semibold text-ink group-hover:text-primary">{older.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {newer && (
                <Link
                  href={newer.href}
                  className="group rounded-2xl border border-hairline p-5 text-right hover:border-ink/30"
                >
                  <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    Next issue <ArrowRight aria-hidden className="size-3.5" />
                  </span>
                  <span className="mt-1.5 block font-semibold text-ink group-hover:text-primary">{newer.title}</span>
                </Link>
              )}
            </nav>
          )}

          <div className="mt-14">
            <SignupBox source="issue" title="Get the next issue by email" />
          </div>
        </div>

        {body && body.headings.length > 0 && (
          <aside className="hidden xl:block">
            <OnThisPage headings={body.headings} />
          </aside>
        )}
      </div>
    </article>
  );
}
