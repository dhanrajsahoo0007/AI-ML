"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { siteConfig } from "@/config/site";

export function CtaBanner() {
  const { cta } = siteConfig;

  return (
    <section className="py-16 sm:py-24">
      <FadeIn>
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-12 text-center sm:p-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {cta.headline}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            {cta.description}
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="shine group">
              <Link href={cta.button.href}>
                {cta.button.label}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
