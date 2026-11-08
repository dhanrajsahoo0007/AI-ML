import { FadeIn } from "@/components/motion/fade-in";
import { MonoIndex, Section } from "@/components/ui/editorial";
import { siteConfig } from "@/config/site";
import { getIconComponent } from "@/lib/icons";

export function Workflow() {
  const { workflow } = siteConfig;

  return (
    <Section index="01" label="How it works" title={workflow.title} intro={workflow.subtitle}>
      <div className="grid gap-10 md:grid-cols-3 md:gap-8">
        {workflow.steps.map((step) => {
          const Icon = getIconComponent(step.icon);
          return (
            <FadeIn key={step.num} inView>
              <div className="border-t border-ink pt-6">
                <div className="flex items-center justify-between">
                  <MonoIndex value={step.num} />
                  {Icon && <Icon aria-hidden className="size-5 text-muted-foreground" />}
                </div>
                <h3 className="mt-6 font-display text-2xl leading-tight">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </Section>
  );
}
