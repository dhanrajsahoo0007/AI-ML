import Link from "next/link";
import { getContentSlugs } from "@/lib/mdx-doc";

export const revalidate = 3600;

export default async function InterviewsIndexPage() {
  const slugs = await getContentSlugs("interviews");

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Interview prep</h1>
        <p className="max-w-2xl text-muted-foreground">
          Collapsible Q&amp;A blocks keep questions visible while hiding answers
          until you are ready.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link
              className="block rounded-lg border border-border/70 bg-card px-4 py-3 transition hover:border-border"
              href={`/interviews/${slug}`}
            >
              <div className="font-medium capitalize">{slug.replaceAll("-", " ")}</div>
              <div className="text-xs text-muted-foreground">Question-first drills</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
