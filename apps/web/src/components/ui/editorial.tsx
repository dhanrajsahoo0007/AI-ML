import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Editorial primitives shared across pages; mirrors dhanraj-portfolio/components/ui.tsx.

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1200px] px-4 sm:px-8", className)}>
      {children}
    </div>
  );
}

export function Eyebrow({
  index,
  className,
  children,
}: {
  index?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}
    >
      {index && <span className="text-primary">{index}</span>}
      {index && <span className="mx-2">—</span>}
      {children}
    </p>
  );
}

export function MonoIndex({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  const label =
    typeof value === "number" ? String(value).padStart(2, "0") : value;
  return (
    <span className={cn("font-mono text-xs text-primary", className)}>
      {label}
    </span>
  );
}

export function SectionHeader({
  index,
  label,
  title,
  intro,
  className,
}: {
  index?: string;
  label?: string;
  title?: React.ReactNode;
  intro?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-12 grid gap-6 sm:mb-16 md:grid-cols-12", className)}>
      <div className="md:col-span-4">
        {label && <Eyebrow index={index}>{label}</Eyebrow>}
      </div>
      <div className="md:col-span-8">
        {title && (
          <h2 className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
            {title}
          </h2>
        )}
        {intro && (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {intro}
          </p>
        )}
      </div>
    </header>
  );
}

export function Section({
  id,
  index,
  label,
  title,
  intro,
  className,
  children,
}: {
  id?: string;
  index?: string;
  label?: string;
  title?: React.ReactNode;
  intro?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("border-t border-hairline py-20 sm:py-28", className)}>
      <Container>
        {(label || title) && (
          <SectionHeader index={index} label={label} title={title} intro={intro} />
        )}
        {children}
      </Container>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-5", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-6xl">
        {title}
      </h1>
      {lead && (
        <p className="max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          {lead}
        </p>
      )}
    </header>
  );
}

const buttonBase =
  "inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors duration-200";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  external,
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  external?: boolean;
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-ink text-paper hover:bg-primary"
      : "border border-ink/20 text-ink hover:border-ink hover:bg-ink hover:text-paper";
  const Icon = external ? ArrowUpRight : ArrowRight;
  const classes = cn(buttonBase, styles, "group", className);
  const content = (
    <>
      {children}
      <Icon
        aria-hidden
        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </>
  );
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}

export function Chip({
  active,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[13px] transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-hairline bg-paper text-ink-2 hover:border-ink/40",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Tag({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-hairline bg-paper px-3 py-1 text-[13px] text-ink-2",
        className
      )}
    >
      {children}
    </span>
  );
}
