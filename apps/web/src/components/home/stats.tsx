import { AnimatedCounter } from "@/components/motion/animated-counter";
import { Container } from "@/components/ui/editorial";

interface StatsProps {
  questions: number;
  articles: number;
  companies: number;
}

export function Stats({ questions, articles, companies }: StatsProps) {
  const stats = [
    { value: questions, suffix: "+", label: "Interview questions" },
    { value: articles, suffix: "", label: "Design articles" },
    { value: companies, suffix: "", label: "Companies covered" },
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
