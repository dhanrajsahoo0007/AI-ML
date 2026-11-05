import {
  BarChart3,
  Columns3,
  FileJson,
  Globe,
  HardDrive,
  KeyRound,
  LineChart,
  Search,
  Share2,
  Sparkles,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FamilyId, Fit, Tone } from "./types";

// Shared bits for the database widgets: family icons, fit colors and the rating dots.

const FAMILY_ICONS: Record<FamilyId, LucideIcon> = {
  relational: Table2,
  "key-value": KeyRound,
  document: FileJson,
  "wide-column": Columns3,
  search: Search,
  "time-series": LineChart,
  graph: Share2,
  vector: Sparkles,
  olap: BarChart3,
  newsql: Globe,
  object: HardDrive,
};

// One diagram tone per family, so a family keeps its color across every widget.
export const FAMILY_TONE: Record<FamilyId, Tone> = {
  relational: "blue",
  "key-value": "red",
  document: "green",
  "wide-column": "violet",
  search: "orange",
  "time-series": "teal",
  graph: "violet",
  vector: "orange",
  olap: "teal",
  newsql: "blue",
  object: "neutral",
};

export function FamilyIcon({ id, className }: { id: FamilyId; className?: string }) {
  const Icon = FAMILY_ICONS[id];
  const tone = FAMILY_TONE[id];
  return (
    <span
      className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]", className)}
      style={{ background: `var(--dg-${tone}-soft)`, color: `var(--dg-${tone})` }}
      aria-hidden
    >
      <Icon />
    </span>
  );
}

export const FIT_LABEL: Record<Fit, string> = { 2: "Strong fit", 1: "Workable", 0: "Poor fit" };
export const FIT_TONE: Record<Fit, Tone> = { 2: "green", 1: "orange", 0: "neutral" };

export function FitMark({ fit, className }: { fit: Fit; className?: string }) {
  const tone = `var(--dg-${FIT_TONE[fit]})`;
  return (
    <span
      className={cn("inline-block size-3.5 rounded-full border-2", className)}
      style={{
        borderColor: tone,
        background: fit === 2 ? tone : fit === 1 ? `linear-gradient(90deg, ${tone} 50%, transparent 50%)` : "transparent",
        opacity: fit === 0 ? 0.55 : 1,
      }}
      aria-label={FIT_LABEL[fit]}
      role="img"
    />
  );
}

export function RatingDots({ value, tone = "blue", label }: { value: number; tone?: Tone; label: string }) {
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`${label}: ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="size-2.5 rounded-full"
          style={{ background: i <= value ? `var(--dg-${tone})` : "var(--hairline)" }}
        />
      ))}
    </span>
  );
}

export function FitLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {([2, 1, 0] as Fit[]).map((f) => (
        <span key={f} className="inline-flex items-center gap-1.5">
          <FitMark fit={f} />
          {FIT_LABEL[f]}
        </span>
      ))}
    </div>
  );
}
