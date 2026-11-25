import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/editorial";
import { withPageSession } from "@/features/auth";
import { listRatings, listStories } from "@/features/practice";
import { listProgress } from "@/features/progress";
import { SyncAccountProgress } from "@/features/progress/sync-account-progress.client";
import { pageInfo } from "@/features/search";
import { getHeaderNav } from "@/lib/nav-tree";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress & bookmarks" };

const date = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";

interface Row {
  key: string;
  at: Date | null;
}

function ContentList({ rows, empty, testId }: { rows: Row[]; empty: string; testId: string }) {
  if (rows.length === 0) return <p className="text-[15px] text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-hairline" data-testid={testId}>
      {rows.map(({ key, at }) => {
        const href = `/${key}`;
        const info = pageInfo(href);
        return (
          <li key={key} className="flex items-baseline justify-between gap-4 py-3">
            <span className="min-w-0">
              <Link href={href} className="block truncate text-[15px] font-medium text-ink hover:text-primary">
                {info?.t ?? key}
              </Link>
              {info && <span className="block truncate text-xs text-muted-foreground">{info.s}</span>}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{date(at)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function AccountProgressPage() {
  const loaded = await withPageSession(async (auth, db) => {
    const [progress, ratings, stories] = await Promise.all([
      listProgress(db, auth.user.id),
      listRatings(db, auth.user.id),
      listStories(db, auth.user.id),
    ]);
    return { progress, ratings: Object.values(ratings), stories };
  });
  if (!loaded) redirect("/sign-in?callbackURL=%2Faccount%2Fprogress");
  const { progress: data, ratings, stories } = loaded;
  const weak = ratings.filter((r) => r.rating <= 2).length;

  const byNewest = (a: Row, b: Row) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0);
  const completed = data.progress
    .filter((p) => p.completedAt)
    .map((p) => ({ key: p.contentKey, at: p.completedAt }))
    .sort(byNewest);
  const bookmarks = data.bookmarks.map((b) => ({ key: b.contentKey, at: b.createdAt })).sort(byNewest);

  const completedKeys = completed.map((c) => c.key);
  const bookmarkKeys = bookmarks.map((b) => b.key);

  const headerNav = await getHeaderNav();
  const tracks = headerNav
    .filter((s) => s.kind === "docs" && !s.comingSoon)
    .map((s) => {
      const total = s.groups.reduce((n, g) => n + g.count, 0);
      const prefix = `${s.key}/`;
      const done = Math.min(
        total,
        completedKeys.filter((k) => k.startsWith(prefix) && k.indexOf("/", prefix.length) !== -1).length
      );
      const percent =
        total === 0 || done === 0
          ? 0
          : done >= total
            ? 100
            : Math.min(99, Math.max(1, Math.round((done / total) * 100)));
      return {
        key: s.key,
        label: s.label,
        href: s.href,
        tone: s.tone,
        completed: done,
        total,
        percent,
      };
    })
    .filter((t) => t.total > 0);

  return (
    <Container className="max-w-3xl space-y-8 py-14 sm:py-20">
      <SyncAccountProgress completed={completedKeys} bookmarks={bookmarkKeys} />
      <PageHeader eyebrow="Account" title="Progress & bookmarks" />

      {tracks.length > 0 && (
        <section
          aria-label="Progress by track"
          data-testid="progress-by-section"
          className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8"
        >
          <h2 className="font-display text-2xl tracking-tight">Progress by track</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {tracks.map((track) => (
              <Link
                key={track.key}
                href={track.href}
                data-tone={track.tone}
                data-testid={`track-progress-${track.key}`}
                className="group flex flex-col justify-between rounded-xl border border-hairline bg-paper-2/50 p-4 transition-colors hover:border-tint/60 hover:bg-paper-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-ink group-hover:text-primary">{track.label}</span>
                  <span
                    className="shrink-0 font-display text-xl tabular-nums text-ink"
                    data-testid={`track-percent-${track.key}`}
                  >
                    {track.percent}%
                  </span>
                </div>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {track.completed} of {track.total} {track.total === 1 ? "topic" : "topics"} completed
                </p>
                <div
                  role="progressbar"
                  aria-label={`${track.label} progress`}
                  aria-valuenow={track.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-paper"
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-300",
                      track.percent === 100 ? "bg-success" : "bg-tint"
                    )}
                    style={{ width: `${track.percent}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Bookmarks" className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-tight">Bookmarks · {bookmarks.length}</h2>
        <div className="mt-4">
          <ContentList rows={bookmarks} empty="Nothing bookmarked yet." testId="progress-bookmarks" />
        </div>
      </section>
      <section aria-label="Completed" className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-tight">Completed · {completed.length}</h2>
        <div className="mt-4">
          <ContentList
            rows={completed}
            empty="Mark articles complete to track them here."
            testId="progress-completed"
          />
        </div>
      </section>
      <section aria-label="Interview practice" className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-tight">Interview practice</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3" data-testid="progress-practice">
          <div>
            <dt className="text-xs text-muted-foreground">Answers you have rated</dt>
            <dd className="font-display text-2xl text-ink">{ratings.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rated 1 or 2, to practise again</dt>
            <dd className="font-display text-2xl text-ink">{weak}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Stories saved</dt>
            <dd className="font-display text-2xl text-ink">{stories.length}</dd>
          </div>
        </dl>
        <p className="mt-4 text-[15px] text-muted-foreground">
          Ratings come from practice mode and the mock loop. Stories come from the story builder.
        </p>
      </section>
      <p className="text-sm text-muted-foreground">
        <Link href="/account" className="underline underline-offset-2">
          Back to your profile
        </Link>
      </p>
    </Container>
  );
}
