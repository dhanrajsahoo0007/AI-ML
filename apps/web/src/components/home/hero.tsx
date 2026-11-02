"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { ButtonLink, Container } from "@/components/ui/editorial";
import { siteConfig } from "@/config/site";

export function Hero() {
  const { hero } = siteConfig;
  const descriptionParts = hero.description.split(/\*\*(.*?)\*\*/g);

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--hairline)_1px,transparent_1px),linear-gradient(90deg,var(--hairline)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] opacity-[0.45]"
      />

      <Container className="relative pt-20 pb-24 sm:pt-28 sm:pb-32">
        <FadeIn delay={0}>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-hairline bg-paper px-3.5 py-1.5 text-[13px] text-ink-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-600 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
            {hero.badge}
          </span>
        </FadeIn>

        <FadeIn delay={0.05}>
          <h1 className="mt-8 max-w-4xl font-display text-[clamp(2.75rem,6.5vw,5.25rem)] leading-[1.02] text-balance">
            {hero.headline[0]}{" "}
            <em className="text-primary">{hero.headline[1]}</em>
          </h1>
        </FadeIn>

        <FadeIn delay={0.12}>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
            {descriptionParts.map((part, i) =>
              i % 2 === 1 ? (
                <span key={i} className="text-ink">
                  {part}
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={hero.primaryCta.href}>
              {hero.primaryCta.label}
            </ButtonLink>
            <ButtonLink href={hero.secondaryCta.href} variant="secondary">
              {hero.secondaryCta.label}
            </ButtonLink>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
