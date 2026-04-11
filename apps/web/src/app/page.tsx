import Link from "next/link";
import { BookOpen, Brain, Layers } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCatalog } from "@/lib/get-catalog";

export const revalidate = 60;

export default async function HomePage() {
  let catalogCount = 0;
  try {
    const catalog = await getCatalog();
    catalogCount = catalog.reduce((n, p) => n + p.modules.length, 0);
  } catch {
    catalogCount = 0;
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          From zero to GenAI, LLMs, and agents—with interview depth
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Origins AI Learn
        </h1>
        <p className="max-w-2xl text-pretty text-lg text-muted-foreground">
          A structured path from <strong className="text-foreground">scratch</strong>{" "}
          through <strong className="text-foreground">ML</strong>,{" "}
          <strong className="text-foreground">deep learning</strong>,{" "}
          <strong className="text-foreground">generative AI</strong>,{" "}
          <strong className="text-foreground">LLMs</strong>, and{" "}
          <strong className="text-foreground">agentic AI</strong>—with{" "}
          <strong className="text-foreground">interview prep</strong> and{" "}
          <strong className="text-foreground">ML system design</strong> so you see how
          ideas land in real systems. Progress is backed by Postgres and Redis.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Learning paths</CardTitle>
            </div>
            <CardDescription>
              ML, deep learning, generative AI, LLMs, and agentic AI—sequenced
              for newcomers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm font-medium underline" href="/learning-paths">
              Browse paths
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Interview prep</CardTitle>
            </div>
            <CardDescription>
              Question-first pages with collapsible answers so you can drill
              without spoiling yourself.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm font-medium underline" href="/interviews">
              Open interviews
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <CardTitle>ML system design</CardTitle>
            </div>
            <CardDescription>
              Serving, data movement, and reliability patterns you will see in
              real systems.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm font-medium underline" href="/system-design">
              Read system notes
            </Link>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Catalog snapshot</h2>
        <p className="text-sm text-muted-foreground">
          Served from Postgres with a short Redis cache. Currently{" "}
          <span className="font-medium text-foreground">{catalogCount}</span>{" "}
          modules are indexed for progress tracking.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="underline" href="/api/v1/catalog">
            View JSON catalog
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link className="underline" href="/api/v1/health">
            Health check
          </Link>
        </div>
      </section>
    </div>
  );
}
