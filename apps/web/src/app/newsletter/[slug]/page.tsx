import Link from "next/link";
import { notFound } from "next/navigation";
import type { ResolvingMetadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader } from "@/components/ui/editorial";
import { NEWSLETTER_KIND, newsletterKind, issueSeo, isBuilt, isPublished, loadIssues } from "@/features/newsletter";
import { issueBody } from "@/features/newsletter/issue-body";
import { SignupBox } from "@/features/newsletter/public";
import { isRouteBuilt, routeSection, sectionOfKind } from "@/features/sections";
import { withParentImages, PAYWALL_CONTAINER_CLASS } from "@/features/seo/public";
import { JsonLd } from "@/features/seo";

// The web version of one issue. Premium issues show the summary and a Pro placeholder inside the paywall
// container; their body is never rendered here (it reaches entitled readers through the §9.2 gate later).

export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  if (!isRouteBuilt(NEWSLETTER_KIND)) return [];
  const section = sectionOfKind(NEWSLETTER_KIND);
  return newsletterKind.staticParams(section, loadIssues(section));
}

function findIssue(slug: string) {
  const section = routeSection(NEWSLETTER_KIND);
  const issue = loadIssues(section).find((i) => i.slug === slug && isBuilt(i));
  if (!issue) notFound();
  return { section, issue };
}

export async function generateMetadata({ params }: { params: Params }, parent: ResolvingMetadata) {
  const { section, issue } = findIssue((await params).slug);
  return withParentImages(issueSeo(section, issue).metadata, parent);
}

const formatDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

export default async function NewsletterIssuePage({ params }: { params: Params }) {
  const { section, issue } = findIssue((await params).slug);
  const premium = newsletterKind.access(section, issue) === "premium";
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
      <PageHeader
        className="mt-10 mb-10 border-b border-hairline pb-10"
        eyebrow={<time dateTime={issue.date}>{formatDate(issue.date)}</time>}
        title={issue.title}
        lead={issue.summary}
      />
      {premium ? (
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
        <div className="prose-editorial max-w-[72ch]">{await issueBody(issue)}</div>
      )}
      <div className="mt-16">
        <SignupBox source="issue" title="Get issues like this by email" />
      </div>
    </article>
  );
}
