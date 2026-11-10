import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui/editorial";
import { sectionOfKind } from "@/features/sections";
import { IssueCard } from "./issue-card";
import { NEWSLETTER_NAME, NEWSLETTER_PROMISE } from "./brand";
import { NEWSLETTER_KIND, newsletterKind } from "./kind";
import { isBuilt, loadIssues } from "./source";

// The home page's "Latest issue" strip (plan §3): the newest issue as a large card. Shown only while the newsletter
// section is `on`; in production that means the newest sent issue (drafts are never built there), and in local and
// preview builds the newest draft, so it can be reviewed in place.

export function LatestIssue() {
  const section = sectionOfKind(NEWSLETTER_KIND);
  if (section.state !== "on") return null;
  const latest = loadIssues(section).find((i) => isBuilt(i));
  if (!latest) return null;
  return (
    <section aria-labelledby="latest-issue" className="border-t border-hairline py-20 sm:py-24">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>Latest issue</Eyebrow>
            <h2
              id="latest-issue"
              className="mt-6 font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl"
            >
              {NEWSLETTER_NAME}
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
              {NEWSLETTER_PROMISE}
            </p>
          </div>
          <Link
            href={section.href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            All issues <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <div className="mt-10">
          <IssueCard
            issue={latest}
            sectionKey={section.key}
            featured
            isNew
            premium={newsletterKind.access(section, latest) === "premium"}
          />
        </div>
      </Container>
    </section>
  );
}
