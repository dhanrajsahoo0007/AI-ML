import { Breadcrumb } from "@/components/breadcrumb";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerChildren } from "@/components/motion/stagger-children";
import { PageHeader } from "@/components/ui/editorial";

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
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20 sm:px-8">
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: breadcrumbLabel }]}
      />

      <FadeIn>
        <PageHeader
          className="mt-10 mb-12 border-b border-hairline pb-12 sm:mb-16"
          title={title}
          lead={subtitle}
        />
      </FadeIn>

      <StaggerChildren
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        itemClassName="h-full"
      >
        {children}
      </StaggerChildren>
    </div>
  );
}
