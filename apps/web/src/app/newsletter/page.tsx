import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader } from "@/components/ui/editorial";
import { NEWSLETTER_KIND, newsletterKind } from "@/features/newsletter/kind";
import { archiveSeo, ARCHIVE_DESCRIPTION, ARCHIVE_TITLE } from "@/features/newsletter/seo";
import { SignupBox } from "@/features/newsletter/signup-box";
import { isBuilt, isPublished, loadIssues } from "@/features/newsletter/source";
import { routeSection } from "@/features/sections/route-helpers";
import { JsonLd } from "@/features/seo/json-ld-script";

export const dynamic = "force-static";

export function generateMetadata() {
  return archiveSeo(routeSection(NEWSLETTER_KIND)).metadata;
}

const formatDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

export default function NewsletterArchivePage() {
  const section = routeSection(NEWSLETTER_KIND);
  const issues = loadIssues(section).filter((i) => isBuilt(i));
  return (
    <>
      <JsonLd data={archiveSeo(section).jsonLd} />
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: section.label }]} />
      <PageHeader className="mt-10 mb-10" title={ARCHIVE_TITLE} lead={ARCHIVE_DESCRIPTION} />
      <SignupBox source="archive" title="Get the next issue" />

      <section aria-labelledby="archive" className="mt-14">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-hairline pb-3">
          <h2 id="archive" className="font-display text-2xl tracking-tight text-ink">
            Past issues
          </h2>
          <a href={`${section.href}/rss.xml`} className="text-sm text-primary hover:underline">
            RSS feed
          </a>
        </div>
        {issues.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">The first issue is on its way.</p>
        ) : (
          <ol className="space-y-8">
            {issues.map((issue) => (
              <li key={issue.slug}>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <time dateTime={issue.date}>{formatDate(issue.date)}</time>
                  {newsletterKind.access(section, issue) === "premium" && (
                    <span className="ml-2 text-primary">Pro</span>
                  )}
                  {!isPublished(issue) && <span className="ml-2">· {issue.status} (not public)</span>}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-ink">
                  <Link href={issue.href} className="hover:text-primary">
                    {issue.title}
                  </Link>
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{issue.summary}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
