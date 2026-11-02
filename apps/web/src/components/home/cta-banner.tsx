"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { ButtonLink, Container, Eyebrow } from "@/components/ui/editorial";
import { siteConfig } from "@/config/site";

export function CtaBanner() {
  const { cta } = siteConfig;

  return (
    <section className="border-t border-hairline bg-paper-2/60 py-20 sm:py-28">
      <Container className="grid gap-10 md:grid-cols-12">
        <FadeIn className="md:col-span-5">
          <Eyebrow index="03">Get started</Eyebrow>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
            {cta.headline}
          </h2>
        </FadeIn>
        <FadeIn delay={0.08} className="md:col-span-7 md:pt-10">
          <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {cta.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={cta.button.href}>{cta.button.label}</ButtonLink>
            <ButtonLink href="/system-design" variant="secondary">
              Browse system design
            </ButtonLink>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
