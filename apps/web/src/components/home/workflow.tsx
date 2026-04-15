"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { StaggerChildren } from "@/components/motion/stagger-children";
import { siteConfig } from "@/config/site";
import { getIconComponent } from "@/lib/icons";

export function Workflow() {
  const { workflow } = siteConfig;

  return (
    <section className="py-16 sm:py-24">
      <FadeIn className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {workflow.title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {workflow.subtitle}
        </p>
      </FadeIn>

      <StaggerChildren className="mt-12 grid gap-6 md:grid-cols-3">
        {workflow.steps.map((step) => {
          const Icon = getIconComponent(step.icon);
          return (
            <div
              key={step.num}
              className="group relative rounded-xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {Icon ? (
                    <Icon className="h-5 w-5 text-primary" />
                  ) : (
                    <span className="text-lg">{step.icon}</span>
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {step.num}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          );
        })}
      </StaggerChildren>
    </section>
  );
}
