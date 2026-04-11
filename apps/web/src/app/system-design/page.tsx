import Link from "next/link";
import { getContentSlugs } from "@/lib/mdx-doc";

export const revalidate = 3600;

export default async function SystemDesignIndexPage() {
  const slugs = await getContentSlugs("system-design");

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">ML system design</h1>
        <p className="max-w-2xl text-muted-foreground">
          Architecture notes focused on reliability, data movement, and the
          interfaces between research and production.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link
              className="block rounded-lg border border-border/70 bg-card px-4 py-3 transition hover:border-border"
              href={`/system-design/${slug}`}
            >
              <div className="font-medium capitalize">{slug.replaceAll("-", " ")}</div>
              <div className="text-xs text-muted-foreground">Architecture note</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
