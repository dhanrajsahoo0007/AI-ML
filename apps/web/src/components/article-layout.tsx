import { FadeIn } from "@/components/motion/fade-in";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { PageHeader } from "@/components/ui/editorial";
import { OnThisPage, OnThisPageMobile } from "@/components/article/on-this-page";
import { UpdatedDate } from "@/components/article/updated-date";
import type { DocHeading } from "@/lib/doc-headings";

export interface DocsLayoutProps {
  headings: DocHeading[];
  /** ISO date of the last change, or null to hide the "Updated" line. */
  updated: string | null;
  /** Site path of the page. */
  pagePath?: string;
  /** Optional inline status badge rendered beside the updated date. */
  statusBadge?: React.ReactNode;
}

// Server component: the header and article arrive as plain HTML; only the table of contents, the relative
// "updated" date and the progress bar's scroll timeline are interactive.
function headerTitle(title: string, logo?: React.ReactNode): React.ReactNode {
  if (!logo) return title;
  return (
    <span className="flex items-center gap-4 sm:gap-5">
      {logo}
      <span className="min-w-0">{title}</span>
    </span>
  );
}

export function ArticleLayout({
  title,
  description,
  docs,
  after,
  logo,
  headerExtra,
  children,
}: {
  title: string;
  description?: string;
  /** A logo tile shown to the left of the title (case studies: <SystemLogo>). */
  logo?: React.ReactNode;
  /** A line under the lead, inside the header (case studies: "Modelled on" logos). */
  headerExtra?: React.ReactNode;
  /** Docs-style layout: "On this page" rail and updated date. */
  docs?: DocsLayoutProps;
  /** Rendered after the article, outside its prose styles (the paywall of a premium preview). */
  after?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!docs) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-20 md:px-8 min-[1440px]:max-w-[2160px] min-[1440px]:px-12 min-[1920px]:px-16">
        <ScrollProgress />
        <FadeIn>
          <PageHeader
            className="mb-12 border-b border-hairline pb-10"
            title={headerTitle(title, logo)}
            lead={description}
          />
          {headerExtra}
        </FadeIn>
        <article className="prose-editorial max-w-[72ch] min-[1440px]:max-w-none [&_:is(h2,h3)]:scroll-mt-24">
          {children}
        </article>
        {after}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 md:px-8 min-[1440px]:max-w-[2160px] min-[1440px]:px-12 min-[1920px]:px-16">
      <ScrollProgress />
      <div className="@[940px]:grid @[940px]:grid-cols-[minmax(0,72ch)_14rem] @[940px]:justify-between @[940px]:gap-12 @[1120px]:grid-cols-[minmax(0,1fr)_15rem] @[1600px]:grid-cols-[minmax(0,1fr)_17rem] @[1600px]:gap-16">
        <div className="min-w-0">
          <FadeIn>
            <div className="mb-10 border-b border-hairline pb-8">
              <PageHeader title={headerTitle(title, logo)} lead={description} />
              {headerExtra}
              {(docs.updated || docs.statusBadge) && (
                <div className="mt-6">
                  {docs.updated && <UpdatedDate iso={docs.updated} />}
                  {docs.statusBadge}
                </div>
              )}
            </div>
          </FadeIn>
          <div className="@[940px]:hidden">
            <OnThisPageMobile headings={docs.headings} />
          </div>
          <article className="prose-editorial [&_:is(h2,h3)]:scroll-mt-24">{children}</article>
          {after}
        </div>
        <aside className="hidden @[940px]:block">
          <OnThisPage headings={docs.headings} />
        </aside>
      </div>
    </div>
  );
}
