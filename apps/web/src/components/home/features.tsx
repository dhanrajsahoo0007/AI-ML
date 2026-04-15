"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StaggerChildren } from "@/components/motion/stagger-children";
import { FadeIn } from "@/components/motion/fade-in";
import { siteConfig } from "@/config/site";
import { getIconComponent } from "@/lib/icons";

export function Features() {
  const { features } = siteConfig;

  return (
    <section className="py-16 sm:py-24">
      <FadeIn className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {features.title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {features.subtitle}
        </p>
      </FadeIn>

      <StaggerChildren className="mt-12 grid gap-6 md:grid-cols-3">
        {features.items.map((feature) => {
          const Icon = getIconComponent(feature.icon);
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className="group relative rounded-xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                {Icon ? (
                  <Icon className="h-6 w-6 text-primary" />
                ) : (
                  <span className="text-xl">{feature.icon}</span>
                )}
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
              <div className="mt-4 flex items-center text-sm font-medium text-primary">
                <span className="transition-transform group-hover:translate-x-1">
                  Explore
                </span>
                <ArrowRight className="ml-1 h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
            </Link>
          );
        })}
      </StaggerChildren>
    </section>
  );
}
