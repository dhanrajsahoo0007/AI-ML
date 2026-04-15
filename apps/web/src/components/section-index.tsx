import { Breadcrumb } from "@/components/breadcrumb";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerChildren } from "@/components/motion/stagger-children";

interface SectionIndexProps {
  breadcrumbLabel: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function SectionIndex({
  breadcrumbLabel,
  title,
  subtitle,
  children,
}: SectionIndexProps) {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-6">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: breadcrumbLabel },
        ]}
      />

      <FadeIn>
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-2xl text-muted-foreground">{subtitle}</p>
        </header>
      </FadeIn>

      <StaggerChildren className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </StaggerChildren>
    </main>
  );
}
