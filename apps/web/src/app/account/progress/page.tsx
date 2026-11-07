import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/editorial";
import { withPageSession } from "@/features/auth";
import { listProgress } from "@/features/progress";
import { pageInfo } from "@/features/search";

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
  const data = await withPageSession(async (auth, db) => listProgress(db, auth.user.id));
  if (!data) redirect("/sign-in?callbackURL=%2Faccount%2Fprogress");

  const byNewest = (a: Row, b: Row) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0);
  const completed = data.progress
    .filter((p) => p.completedAt)
    .map((p) => ({ key: p.contentKey, at: p.completedAt }))
    .sort(byNewest);
  const bookmarks = data.bookmarks.map((b) => ({ key: b.contentKey, at: b.createdAt })).sort(byNewest);

  return (
    <Container className="max-w-3xl space-y-8 py-14 sm:py-20">
      <PageHeader eyebrow="Account" title="Progress & bookmarks" />
      <section aria-label="Bookmarks" className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-tight">Bookmarks · {bookmarks.length}</h2>
        <div className="mt-4">
          <ContentList rows={bookmarks} empty="Nothing bookmarked yet." testId="progress-bookmarks" />
        </div>
      </section>
      <section aria-label="Completed" className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-tight">Completed · {completed.length}</h2>
        <div className="mt-4">
          <ContentList rows={completed} empty="Mark articles complete to track them here." testId="progress-completed" />
        </div>
      </section>
      <p className="text-sm text-muted-foreground">
        <Link href="/account" className="underline underline-offset-2">
          Back to your profile
        </Link>
      </p>
    </Container>
  );
}
