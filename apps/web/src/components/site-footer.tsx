import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container, Eyebrow } from "@/components/ui/editorial";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-paper-2/60">
      <Container className="grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-6">
          <p className="font-display text-3xl leading-tight text-balance sm:text-4xl">
            From scratch to <em className="text-primary">job-ready AI.</em>
          </p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            AI system design deep-dives, system design case studies and
            interview drills in one place.
          </p>
        </div>

        <div className="md:col-span-3">
          <Eyebrow>Learn</Eyebrow>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-ink-2 transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <Eyebrow>Connect</Eyebrow>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            <li>
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ink-2 transition-colors hover:text-primary"
              >
                GitHub
                <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-hairline">
        <Container className="flex flex-col gap-2 py-6 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:flex-row sm:justify-between">
          <span>
            &copy; {new Date().getFullYear()} {siteConfig.name}
          </span>
          <span>Built with Next.js</span>
        </Container>
      </div>
    </footer>
  );
}
