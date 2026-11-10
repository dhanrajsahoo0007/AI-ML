import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { MonoIndex, Section } from "@/components/ui/editorial";
import { siteConfig } from "@/config/site";
import { getIconComponent } from "@/lib/icons";

export function Features() {
  const { features } = siteConfig;
  // Each card takes the tint of the section it links to (sections.yaml `tone`), the one place the hues meet.
  const toneOf = (href: string) => siteConfig.nav.find((s) => href === s.href || href.startsWith(`${s.href}/`))?.tone;

  return (
    <Section
      index="02"
      label="What's inside"
      title={features.title}
      intro={features.subtitle}
      className="bg-paper-2/50"
    >
      <FadeIn inView>
        <div className="grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline md:grid-cols-2 lg:grid-cols-4">
          {features.items.map((feature, i) => {
            const Icon = getIconComponent(feature.icon);
            return (
              <Link
                key={feature.href}
                href={feature.href}
                data-tone={toneOf(feature.href)}
                className="group flex flex-col bg-paper p-7 transition-colors duration-300 hover:bg-tint-soft/60"
              >
                <div className="flex items-center justify-between">
                  <MonoIndex value={i + 1} />
                  {Icon && (
                    <span className="flex size-9 items-center justify-center rounded-lg bg-tint-soft text-tint">
                      <Icon aria-hidden className="size-[18px]" />
                    </span>
                  )}
                </div>
                <h3 className="mt-10 font-display text-2xl leading-tight">{feature.title}</h3>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted-foreground">{feature.description}</p>
                <span className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                  Explore
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </FadeIn>
    </Section>
  );
}
