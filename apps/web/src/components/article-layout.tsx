"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { PageHeader } from "@/components/ui/editorial";

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
    <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-20 md:px-8">
      <ScrollProgress />
      <FadeIn>
        <PageHeader
          className="mb-12 border-b border-hairline pb-10"
          title={title}
          lead={description}
        />
      </FadeIn>
      <article className="prose-editorial max-w-[72ch] [&_:is(h2,h3)]:scroll-mt-24">
        {children}
      </article>
    </div>
  );
}
