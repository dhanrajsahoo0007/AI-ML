"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  Bell,
  Database,
  Globe,
  HardDrive,
  Layers,
  MessagesSquare,
  Network,
  Pause,
  Play,
  Server,
  Smartphone,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { getIconComponent } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Phase } from "./build-view";
import type { Bounds } from "./geometry";
import { Glyph, isGlyph } from "./glyphs";
import { TONES, phaseOpacity, soft, stroke, textWidth } from "./diagram-style";
import type { DiagramStep, DiagramZone, Tone } from "./types";

// Pieces shared by the architecture, sequence and layout renderers: tones, icons, the figure chrome (step header,
// play/pause, stepper, caption), zones, the NEW marker and the travelling packet.

// Lucide fallbacks for icon names that have no drawn glyph.
export const DIAGRAM_ICONS: Record<string, LucideIcon> = {
  phone: Smartphone,
  "load-balancer": Network,
  chat: MessagesSquare,
  database: Database,
  cache: Zap,
  bell: Bell,
  blob: HardDrive,
  socket: Activity,
  queue: Layers,
  users: Users,
  server: Server,
  globe: Globe,
  workers: Workflow,
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

interface Playback {
  figRef: React.RefObject<HTMLElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** Animation is on screen, not paused and not under reduced motion. */
  running: boolean;
  reduced: boolean;
  playing: boolean;
  setPlaying: (update: (p: boolean) => boolean) => void;
  /** Build step shown (undefined = full diagram). */
  current: number | undefined;
  setCurrent: (step: number | undefined) => void;
  /** Unique id prefix for SVG defs. */
  uid: string;
}

/** Play state of a diagram: in view (IntersectionObserver), play/pause, reduced motion, current build step. */
export function usePlayback(step: number | undefined, idBase?: string): Playback {
  const generated = useId();
  const uid = `dg${(idBase ?? generated).replace(/[^a-zA-Z0-9]/g, "")}`;
  const figRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [current, setCurrent] = useState<number | undefined>(step);
  const reduced = useReducedMotion();
  const running = inView && playing && !reduced;

  useEffect(() => {
    const el = figRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // SMIL packets are paused through the SVG element; CSS dashes and rings follow data-running.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (running) svg.unpauseAnimations();
    else svg.pauseAnimations();
  }, [running, current]);

  return { figRef, svgRef, running, reduced, playing, setPlaying, current, setCurrent, uid };
}

/**
 * The figure around a diagram's SVG: step header ("Step 2 of 8", title, covers, New: ...), play/pause button,
 * the scrollable SVG, the stepper buttons and the caption. `children` is the SVG content; `toolbar` goes above
 * the header (the cloud toggle).
 */
export function DiagramFigure({
  playback,
  title,
  alt,
  caption,
  steps = [],
  stepper = false,
  added = [],
  width,
  height,
  minWidth = 680,
  toolbar,
  children,
}: {
  playback: Playback;
  title: string;
  alt?: string;
  caption?: string;
  steps?: DiagramStep[];
  stepper?: boolean;
  /** Labels of the elements the current step added. */
  added?: string[];
  width: number;
  height: number;
  minWidth?: number;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  const { figRef, svgRef, running, reduced, playing, setPlaying, current, setCurrent } = playback;
  const info = current !== undefined ? steps[current - 1] : undefined;
  const label = caption ?? title;

  return (
    <figure ref={figRef} className="my-10 xl:-mx-24 2xl:-mx-40">
      {toolbar}
      {(current !== undefined || stepper) && (
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {current !== undefined ? `Step ${current} of ${steps.length}` : "Full design"}
          </span>
          <span className="font-semibold text-ink">{info ? info.title : title}</span>
          {info?.covers && (
            <span className="rounded-full border border-hairline px-2 py-0.5 text-xs text-muted-foreground">
              {info.covers}
            </span>
          )}
          {current !== undefined && added.length > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold" style={{ color: "var(--dg-green)" }}>
                New:
              </span>{" "}
              {added.join(", ")}
            </span>
          )}
        </div>
      )}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div style={{ minWidth }} className="relative rounded-xl border border-hairline bg-paper p-3 sm:p-5">
          {!reduced && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause animation" : "Play animation"}
              className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full border border-hairline bg-paper text-muted-foreground transition-colors hover:border-ink hover:text-ink"
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
          )}
          <svg
            key={current ?? "full"}
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={info ? `${label}: step ${current}, ${info.title}` : label}
            data-running={running}
            data-reduced-motion={reduced || undefined}
            className="dg h-auto w-full font-sans"
          >
            <title>{label}</title>
            {alt && <desc>{alt}</desc>}
            {children}
          </svg>
        </div>
      </div>
      {stepper && steps.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Build steps">
          {steps.map((s, i) => (
            <StepButton key={i} active={current === i + 1} onClick={() => setCurrent(i + 1)} title={s.title}>
              {i + 1}
            </StepButton>
          ))}
          <StepButton active={current === undefined} onClick={() => setCurrent(undefined)} title="Full design">
            Full design
          </StepButton>
        </div>
      )}
      {caption && (
        <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Fig. — {caption}
        </figcaption>
      )}
    </figure>
  );
}

function StepButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2.5 text-xs font-semibold transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-hairline text-muted-foreground hover:border-ink hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

/** Arrowhead markers, one per tone: url(#<uid>-arrow-<tone>). */
export function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      {TONES.map((t) => (
        <marker
          key={t}
          id={`${uid}-arrow-${t}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" style={{ fill: stroke(t) }} />
        </marker>
      ))}
    </defs>
  );
}

export function Zone({ zone, phase, dim = false }: { zone: DiagramZone; phase: Phase; dim?: boolean }) {
  const cls = dim ? "dg-dim" : undefined;
  if (zone.kind) return <BoundaryZone zone={zone} phase={phase} className={cls} />;
  const tabW = zone.title.length * 8.2 + 28;
  return (
    <g opacity={phaseOpacity(phase)} className={cls} data-dim={dim || undefined}>
      <rect
        x={zone.x}
        y={zone.y}
        width={zone.w}
        height={zone.h}
        rx={14}
        style={{ fill: soft(zone.tone), stroke: stroke(zone.tone) }}
        strokeWidth={1.4}
        strokeDasharray="2 5"
        strokeLinecap="round"
        strokeOpacity={0.8}
      />
      <rect
        x={zone.x + 16}
        y={zone.y - 14}
        width={tabW}
        height={28}
        rx={7}
        style={{ fill: "var(--paper)", stroke: stroke(zone.tone) }}
        strokeWidth={1.2}
      />
      <text
        x={zone.x + 16 + tabW / 2}
        y={zone.y + 4.5}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        style={{ fill: stroke(zone.tone) }}
      >
        {zone.title}
      </text>
    </g>
  );
}

// Deployment boundaries: a Region outline, a solid tinted VPC, and tinted subnet bands with an inline label.
function BoundaryZone({ zone, phase, className }: { zone: DiagramZone; phase: Phase; className?: string }) {
  const t = zone.tone;
  const opacity = phaseOpacity(phase);
  if (zone.kind === "subnet") {
    return (
      <g opacity={opacity} className={className}>
        <rect
          x={zone.x}
          y={zone.y}
          width={zone.w}
          height={zone.h}
          rx={10}
          style={{ fill: soft(t), stroke: stroke(t) }}
          strokeWidth={1}
          strokeOpacity={0.45}
        />
        <text
          x={zone.x + 12}
          y={zone.y + 20}
          fontSize={11.5}
          fontWeight={700}
          letterSpacing={0.6}
          style={{ fill: stroke(t) }}
        >
          {zone.title.toUpperCase()}
        </text>
      </g>
    );
  }
  const region = zone.kind === "region";
  const tabW = zone.title.length * 7.6 + 24;
  return (
    <g opacity={opacity} className={className}>
      <rect
        x={zone.x}
        y={zone.y}
        width={zone.w}
        height={zone.h}
        rx={region ? 16 : 12}
        style={{ fill: region ? "none" : soft(t), stroke: stroke(t) }}
        fillOpacity={0.35}
        strokeWidth={region ? 1.6 : 1.8}
      />
      <rect
        x={zone.x + 14}
        y={zone.y - 12}
        width={tabW}
        height={24}
        rx={6}
        style={{ fill: region ? "var(--paper)" : stroke(t), stroke: stroke(t) }}
        strokeWidth={1.2}
      />
      <text
        x={zone.x + 14 + tabW / 2}
        y={zone.y + 4.5}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        style={{ fill: region ? stroke(t) : "var(--paper)" }}
      >
        {zone.title}
      </text>
    </g>
  );
}

/** Pulsing dashed outline and "NEW" tag around an element added in the current build step. */
export function NewRing({ bounds, pad = 7 }: { bounds: Bounds; pad?: number }) {
  const x = bounds.x1 - pad;
  const y = bounds.y1 - pad;
  const w = bounds.x2 - bounds.x1 + pad * 2;
  const h = bounds.y2 - bounds.y1 + pad * 2;
  return (
    <g data-new="true">
      <rect
        className="dg-new-ring"
        x={x}
        y={y}
        width={w}
        height={h}
        rx={14}
        fill="none"
        style={{ stroke: stroke("green") }}
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <rect x={x + w - 40} y={y - 9} width={40} height={18} rx={9} style={{ fill: stroke("green") }} />
      <text
        x={x + w - 20}
        y={y + 4}
        textAnchor="middle"
        fontSize={10.5}
        fontWeight={700}
        letterSpacing={0.6}
        style={{ fill: "var(--paper)" }}
      >
        NEW
      </text>
    </g>
  );
}

/** Soft pulsing ring in a tone around a highlighted element (highlight/path props, layout `highlight`). */
export function HighlightRing({
  bounds,
  tone,
  pad = 6,
  rx = 14,
}: {
  bounds: Bounds;
  tone: Tone;
  pad?: number;
  rx?: number;
}) {
  return (
    <rect
      className="dg-hl-ring"
      x={bounds.x1 - pad}
      y={bounds.y1 - pad}
      width={bounds.x2 - bounds.x1 + pad * 2}
      height={bounds.y2 - bounds.y1 + pad * 2}
      rx={rx}
      fill="none"
      style={{ stroke: stroke(tone) }}
      strokeWidth={3}
      strokeOpacity={0.55}
    />
  );
}

/**
 * A dot travelling along path `d`. `dur` seconds per trip, starting `begin` seconds in. With `cycle` (longer than
 * dur) the trip is one part of a longer loop: the dot moves for `dur`, then hides until the cycle restarts, so
 * several packets can run one after another (sequence diagrams).
 */
export function Packet({
  d,
  tone,
  begin,
  dur,
  cycle,
}: {
  d: string;
  tone: Tone;
  begin: number;
  dur: number;
  cycle?: number;
}) {
  const b = `${begin}s`;
  const sequenced = cycle !== undefined && cycle > dur + 0.01;
  const f = sequenced ? Math.min(0.999, dur / cycle) : 1;
  const total = sequenced ? `${cycle}s` : `${dur}s`;
  return (
    <g className="dg-packet" opacity={0}>
      <circle r={7} style={{ fill: stroke(tone) }} opacity={0.18} />
      <circle r={3.6} style={{ fill: stroke(tone) }} />
      {sequenced ? (
        <>
          <animateMotion
            dur={total}
            begin={b}
            repeatCount="indefinite"
            path={d}
            calcMode="linear"
            keyPoints={`0;1;1`}
            keyTimes={`0;${f.toFixed(4)};1`}
          />
          <animate
            attributeName="opacity"
            dur={total}
            begin={b}
            repeatCount="indefinite"
            calcMode="discrete"
            values="1;0"
            keyTimes={`0;${f.toFixed(4)}`}
          />
        </>
      ) : (
        <>
          <animateMotion dur={total} begin={b} repeatCount="indefinite" path={d} />
          <set attributeName="opacity" to="1" begin={b} />
        </>
      )}
    </g>
  );
}

/** Rounded label pill centred on (x, y). */
export function LabelPill({
  x,
  y,
  text,
  tone,
  bold = false,
}: {
  x: number;
  y: number;
  text: string;
  tone: Tone;
  bold?: boolean;
}) {
  const w = textWidth(text) + 14;
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - 10}
        width={w}
        height={20}
        rx={10}
        style={{ fill: "var(--paper)", stroke: stroke(tone) }}
        strokeOpacity={0.35}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={11.5}
        fontWeight={bold ? 600 : 500}
        style={{ fill: stroke(tone) }}
      >
        {text}
      </text>
    </g>
  );
}

/**
 * The icon for a node or lane, drawn centred on (cx, cy): a drawn glyph when the name is one, otherwise a Lucide
 * icon from DIAGRAM_ICONS or src/lib/icons. Returns null for unknown names.
 */
export function IconAt({
  name,
  tone,
  cx,
  cy,
  size,
}: {
  name?: string;
  tone: Tone;
  cx: number;
  cy: number;
  size: number;
}) {
  if (!name) return null;
  if (isGlyph(name)) return <Glyph name={name} tone={tone} cx={cx} cy={cy} size={size} />;
  const Icon = DIAGRAM_ICONS[name] ?? getIconComponent(name);
  if (!Icon) return null;
  const s = size * 0.62;
  return <Icon x={cx - s / 2} y={cy - s / 2} width={s} height={s} style={{ color: stroke(tone) }} />;
}
