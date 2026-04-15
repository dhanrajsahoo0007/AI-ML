import * as React from "react";
import Link from "next/link";
import { resolveIcon, resolveCategoryIcon } from "@/lib/icons";

export function ModelCategory({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-16 mt-16 first:mt-0">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight flex items-center justify-center gap-3 mb-2 sm:text-3xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {resolveCategoryIcon(icon)}
          </span>
          <span>{title}</span>
        </h2>
        {subtitle && (
          <p className="text-muted-foreground text-base max-w-2xl mx-auto mt-2">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export function ModelGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

export function ModelCard({
  title,
  icon,
  description,
  href,
}: {
  title: string;
  icon: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block h-full">
      <div className="h-full rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm text-card-foreground transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 flex flex-col p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            {resolveIcon(icon)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold leading-snug">{title}</h3>
            <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
