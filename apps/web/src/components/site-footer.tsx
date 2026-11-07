import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container, Eyebrow } from "@/components/ui/editorial";
import { siteConfig } from "@/config/site";
import { business, MOR_NOTICE } from "@/config/business";

const companyLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/security", label: "Security" },
];

const legalLinks = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/refunds", label: "Refunds" },
  { href: "/legal/attributions", label: "Attributions" },
  { href: "/legal/copyright", label: "Copyright" },
];

function LinkList({ links }: { links: { href: string; label: string }[] }) {
  return (
    <ul className="mt-4 space-y-2.5 text-[15px]">
      {links.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="text-ink-2 transition-colors hover:text-primary">
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  return (
    // Copyable (data-copy-ok): the footer holds contact details, even where a content layout renders it in <main>.
    <footer data-copy-ok className="border-t border-hairline bg-paper-2/60">
      <Container className="grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="font-display text-3xl leading-tight text-balance sm:text-4xl">
            From scratch to <em className="text-primary">job-ready AI.</em>
          </p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            AI system design deep-dives, system design case studies and
            interview drills in one place.
          </p>
          <p className="mt-6 text-[15px] text-ink-2">
            {business.FOUNDER_NAME} ·{" "}
            <a
              href={`mailto:${business.FOUNDER_EMAIL}`}
              className="underline underline-offset-2 transition-colors hover:text-primary"
            >
              {business.FOUNDER_EMAIL}
            </a>
          </p>
        </div>

        <nav aria-label="Learn" className="md:col-span-3">
          <Eyebrow>Learn</Eyebrow>
          <LinkList links={siteConfig.nav} />
        </nav>

        <nav aria-label="Company" className="md:col-span-2">
          <Eyebrow>Company</Eyebrow>
          <LinkList links={companyLinks} />
          <ul className="mt-2.5 space-y-2.5 text-[15px]">
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
        </nav>

        <nav aria-label="Legal" className="md:col-span-3">
          <Eyebrow>Legal</Eyebrow>
          <LinkList links={legalLinks} />
        </nav>
      </Container>

      <div className="border-t border-hairline">
        <Container className="flex flex-col gap-3 py-6 text-[13px] leading-relaxed text-muted-foreground md:flex-row md:items-start md:justify-between md:gap-10">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em]">
            &copy; {new Date().getFullYear()} {business.BRAND}. All rights reserved.
          </span>
          <span className="max-w-2xl md:text-right">{MOR_NOTICE} 7-day money-back guarantee.</span>
        </Container>
      </div>
    </footer>
  );
}
