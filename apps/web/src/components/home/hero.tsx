"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { siteConfig } from "@/config/site";

export function Hero() {
  const { hero } = siteConfig;

  const descriptionParts = hero.description.split(/\*\*(.*?)\*\*/g);

  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
      <motion.div
        className="pointer-events-none absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-10 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute top-1/3 right-1/3 h-64 w-64 rounded-full bg-accent-foreground/5 blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, 25, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative space-y-6">
        <FadeIn delay={0}>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            {hero.badge}
          </span>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="max-w-3xl text-5xl font-bold tracking-tighter sm:text-6xl lg:text-7xl">
            {hero.headline.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                <span className="bg-gradient-to-br from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent">
                  {line}
                </span>
              </span>
            ))}
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {descriptionParts.map((part, i) =>
              i % 2 === 1 ? (
                <strong key={i} className="text-foreground">
                  {part}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="shine group">
              <Link href={hero.primaryCta.href}>
                {hero.primaryCta.label}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={hero.secondaryCta.href}>
                {hero.secondaryCta.label}
              </Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
