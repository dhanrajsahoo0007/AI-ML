"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { AnimatedCounter } from "@/components/motion/animated-counter";

interface StatsProps {
  modules: number;
  paths: number;
  topics: number;
}

export function Stats({ modules, paths, topics }: StatsProps) {
  return (
    <section className="py-16 sm:py-24">
      <FadeIn>
        <div className="flex flex-col items-center justify-center gap-8 rounded-2xl bg-muted/30 px-8 py-12 sm:flex-row sm:gap-16">
          <div className="text-center">
            <AnimatedCounter
              to={modules}
              suffix="+"
              className="text-4xl font-bold"
            />
            <p className="mt-1 text-sm text-muted-foreground">Modules</p>
          </div>
          <div className="hidden h-8 w-px bg-border/60 sm:block" />
          <div className="text-center">
            <AnimatedCounter to={paths} className="text-4xl font-bold" />
            <p className="mt-1 text-sm text-muted-foreground">
              Learning Paths
            </p>
          </div>
          <div className="hidden h-8 w-px bg-border/60 sm:block" />
          <div className="text-center">
            <AnimatedCounter to={topics} className="text-4xl font-bold" />
            <p className="mt-1 text-sm text-muted-foreground">
              Content Areas
            </p>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
