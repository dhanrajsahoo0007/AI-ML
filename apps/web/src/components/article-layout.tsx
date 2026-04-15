"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { ScrollProgress } from "@/components/motion/scroll-progress";

export function ArticleLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8">
      <ScrollProgress />
      <FadeIn>
        <header className="mb-10 border-b border-border/40 pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-lg text-muted-foreground">{description}</p>
          ) : null}
        </header>
      </FadeIn>
      <article
        className={[
          "prose prose-neutral max-w-none dark:prose-invert",
          "prose-headings:scroll-mt-20",
          "prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border/40 prose-h2:pb-2 prose-h2:text-2xl prose-h2:font-bold prose-h2:tracking-tight",
          "prose-h3:mt-8 prose-h3:text-lg prose-h3:font-semibold",
          "prose-strong:text-foreground",
          "prose-p:leading-7",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        ].join(" ")}
      >
        {children}
      </article>
    </main>
  );
}
