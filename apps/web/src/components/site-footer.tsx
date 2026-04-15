import Link from "next/link";
import { Github } from "lucide-react";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="font-semibold tracking-tight">{siteConfig.name}</p>
          <p className="text-sm text-muted-foreground">
            From scratch to job-ready AI.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Navigate</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Connect</p>
          <div className="flex items-center gap-3">
            <Link
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">Built with Next.js</p>
        </div>
      </div>

      <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {siteConfig.name}
      </div>
    </footer>
  );
}
