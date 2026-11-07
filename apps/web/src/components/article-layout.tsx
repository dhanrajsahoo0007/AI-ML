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
}

// Server component: the header and article arrive as plain HTML; only the table of contents, the relative
// "updated" date and the progress bar's scroll timeline are interactive.
export function ArticleLayout({
  title,
  description,
  docs,
  after,
  children,
}: {
  title: string;
  description?: string;
  /** Docs-style layout: "On this page" rail and updated date. */
  docs?: DocsLayoutProps;
  /** Rendered after the article, outside its prose styles (the paywall of a premium preview). */
  after?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!docs) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-20 md:px-8">
        <ScrollProgress />
        <FadeIn>
          <PageHeader className="mb-12 border-b border-hairline pb-10" title={title} lead={description} />
        </FadeIn>
        <article className="prose-editorial max-w-[72ch] [&_:is(h2,h3)]:scroll-mt-24">{children}</article>
        {after}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 md:px-8">
      <ScrollProgress />
      <div className="xl:grid xl:grid-cols-[minmax(0,72ch)_14rem] xl:justify-between xl:gap-12">
        <div className="min-w-0">
          <FadeIn>
            <div className="mb-10 border-b border-hairline pb-8">
              <PageHeader title={title} lead={description} />
              {docs.updated && (
                <div className="mt-6">
                  <UpdatedDate iso={docs.updated} />
                </div>
              )}
            </div>
          </FadeIn>
          <div className="xl:hidden">
            <OnThisPageMobile headings={docs.headings} />
          </div>
          <article className="prose-editorial [&_:is(h2,h3)]:scroll-mt-24">{children}</article>
          {after}
        </div>
        <aside className="hidden xl:block">
          <OnThisPage headings={docs.headings} />
        </aside>
      </div>
    </div>
  );
}
