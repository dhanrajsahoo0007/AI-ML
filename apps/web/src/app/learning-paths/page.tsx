import Link from "next/link";
import { getContentSlugs } from "@/lib/mdx-doc";

export const revalidate = 3600;

export default async function LearningPathsIndexPage() {
  const slugs = await getContentSlugs("learning-paths");

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Learning paths</h1>
        <p className="max-w-2xl text-muted-foreground">
          Each path pairs long-form notes with modules you can track in the
          database-backed catalog.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link
              className="block rounded-lg border border-border/70 bg-card px-4 py-3 transition hover:border-border"
              href={`/learning-paths/${slug}`}
            >
              <div className="font-medium capitalize">{slug.replaceAll("-", " ")}</div>
              <div className="text-xs text-muted-foreground">Open modules + guide</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
