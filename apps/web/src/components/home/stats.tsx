"use client";

import { AnimatedCounter } from "@/components/motion/animated-counter";
import { Container } from "@/components/ui/editorial";

interface StatsProps {
  modules: number;
  paths: number;
  topics: number;
}

export function Stats({ modules, paths, topics }: StatsProps) {
  const stats = [
    { value: modules, suffix: "+", label: "Modules" },
    { value: paths, suffix: "", label: "Learning paths" },
    { value: topics, suffix: "", label: "Topics written up" },
  ];

  return (
    <section className="border-y border-hairline bg-ink text-paper dark:bg-paper-2 dark:text-ink">
      <Container>
        <dl className="grid divide-y divide-paper/10 dark:divide-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col-reverse py-10 sm:px-8 sm:py-14 sm:first:pl-0"
            >
              <dt className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-paper/70 dark:text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="font-display text-5xl sm:text-6xl">
                <AnimatedCounter to={stat.value} suffix={stat.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
