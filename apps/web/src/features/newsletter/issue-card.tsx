import Link from "next/link";
import { cn } from "@/lib/utils";
import { CoverPlaceholder, IssueCover } from "./cover/issue-cover";
import { formatIssueDate, issueLabels } from "./meta";
import { isPublished, type Issue } from "./source";

// One issue in the archive grid and on the home page: cover, series, number, title, summary and reading time.
// `featured` is the large card for the newest issue.

export function IssueCard({
  issue,
  sectionKey,
  featured,
  isNew,
  premium,
}: {
  issue: Issue;
  sectionKey: string;
  featured?: boolean;
  isNew?: boolean;
  premium?: boolean;
}) {
  const { series } = issueLabels(sectionKey, issue);
  const kicker = [issue.number !== undefined && `Issue #${issue.number}`, series].filter(Boolean).join(" · ");
  const cover = issue.cover ? (
    <IssueCover cover={issue.cover} variant="card" id={issue.slug} className="aspect-[4/3] h-full w-full" />
  ) : (
    <CoverPlaceholder className="aspect-[4/3] h-full w-full" />
  );
  return (
    <Link
      href={issue.href}
      className={cn(
        "group flex h-full overflow-hidden rounded-2xl border border-hairline bg-paper transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-[0_22px_48px_-28px_rgba(17,17,17,0.45)]",
        featured ? "flex-col md:flex-row" : "flex-col"
      )}
    >
      <div className={cn("relative overflow-hidden", featured && "md:w-[55%] md:shrink-0")}>
        <div className="h-full transition-transform duration-500 group-hover:scale-[1.03]">{cover}</div>
        <div className="absolute top-3 left-3 flex gap-1.5">
          {isNew && (
            <span className="rounded-full bg-paper/90 px-2.5 py-0.5 text-xs font-semibold text-ink backdrop-blur">
              New
            </span>
          )}
          {premium && (
            <span className="rounded-full bg-ink/85 px-2.5 py-0.5 text-xs font-semibold text-paper">Pro</span>
          )}
          {!isPublished(issue) && (
            <span className="rounded-full bg-paper/90 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {issue.status}
            </span>
          )}
        </div>
      </div>
      <div className={cn("flex flex-1 flex-col", featured ? "p-6 sm:p-9 md:justify-center" : "p-5 sm:p-6")}>
        {kicker && <p className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">{kicker}</p>}
        <h3
          className={cn(
            "mt-2 font-display leading-tight tracking-tight text-ink group-hover:text-primary",
            featured ? "text-3xl sm:text-4xl" : "text-xl"
          )}
        >
          {issue.title}
        </h3>
        <p
          className={cn(
            "mt-3 leading-relaxed text-muted-foreground",
            featured ? "text-base sm:text-[17px]" : "line-clamp-3 text-[15px]"
          )}
        >
          {issue.summary}
        </p>
        <p className="mt-auto pt-5 text-[13px] text-muted-foreground">
          <time dateTime={issue.date}>{formatIssueDate(issue.date)}</time> · {issue.readingTime} min read
        </p>
      </div>
    </Link>
  );
}
