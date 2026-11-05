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
import { DIAGRAMS } from "./specs";
import { GLYPH_SIZE, NODE_H, NODE_W, edgePoints, nodeBox, pathD, pointAt } from "./geometry";
import { Glyph, isGlyph } from "./glyphs";
import type { CloudProvider, CloudRef, DiagramEdge, DiagramNode, DiagramSpec, DiagramZone, Tone } from "./types";

// Lucide fallbacks for icon names that have no drawn glyph.
const DIAGRAM_ICONS: Record<string, LucideIcon> = {
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

const TONES: Tone[] = ["blue", "green", "orange", "red", "violet", "teal", "neutral"];
const stroke = (t: Tone) => `var(--dg-${t})`;
const soft = (t: Tone) => `var(--dg-${t}-soft)`;

// Cloud toggle: "generic" shows the role names; a provider shows the managed service that plays each role.
type CloudView = "generic" | CloudProvider;
const CLOUD_VIEWS: { id: CloudView; label: string; tone?: Tone }[] = [
  { id: "generic", label: "Generic" },
  { id: "aws", label: "AWS", tone: "orange" },
  { id: "gcp", label: "Google Cloud", tone: "green" },
  { id: "azure", label: "Azure", tone: "blue" },
];

// Label for a cloud ref: an explicit label, the catalog short name for an id, or the string itself.
function cloudLabel(ref: CloudRef, names: Record<string, string>) {
  return typeof ref === "string" ? names[ref] ?? ref : ref.label;
}

/** How an element is drawn at the current build step: added in this step, carried over, or full diagram. */
type Phase = "new" | "old" | "full";

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

const nodeStep = (n: DiagramNode) => n.step ?? 1;

// Which nodes, edges and zones appear at build `step` (undefined = the full diagram), and in which phase.
function buildView(spec: DiagramSpec, step: number | undefined) {
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const phase = (introduced: number): Phase =>
    step === undefined ? "full" : introduced === step ? "new" : "old";

  const nodes = spec.nodes
    .filter((n) => step === undefined || nodeStep(n) <= step)
    .map((n) => ({ node: n, phase: phase(nodeStep(n)) }));
  const shown = new Set(nodes.map((v) => v.node.id));

  const edges = spec.edges.flatMap((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to || !shown.has(from.id) || !shown.has(to.id)) return [];
    const introduced = edge.step ?? Math.max(nodeStep(from), nodeStep(to));
    if (step === undefined ? edge.until !== undefined : introduced > step || (edge.until !== undefined && step > edge.until)) {
      return [];
    }
    return [{ edge, from, to, phase: phase(introduced) }];
  });

  // In a step view the packets of the new edges start together, whatever their place in the full story.
  const firstDelay = Math.min(...edges.filter((e) => e.phase === "new").map((e) => e.edge.delay ?? 0));
  const timed = edges.map((e) => ({
    ...e,
    delay: e.phase === "new" ? (e.edge.delay ?? 0) - firstDelay : e.edge.delay ?? 0,
  }));

  const inside = (z: DiagramZone, n: DiagramNode) => n.x >= z.x && n.x <= z.x + z.w && n.y >= z.y && n.y <= z.y + z.h;
  const zones = spec.zones
    .filter((z) => nodes.some((v) => inside(z, v.node)))
    .map((z) => ({
      zone: z,
      phase: (step === undefined ? "full" : nodes.some((v) => v.phase === "new" && inside(z, v.node)) ? "new" : "old") as Phase,
    }));

  return { nodes, edges: timed, zones };
}

// Architecture diagram drawn from a spec in ./specs, with marching dashes and packets travelling along
// the edges. `step` draws the design as it stands after that build step, highlighting what the step added;
// `stepper` adds controls to walk through every step. Animation runs only on screen and not for reduced motion.
export function AnimatedDiagram({
  name,
  caption,
  step,
  stepper = false,
  minWidth = 680,
  cloudNames = {},
}: {
  name: string;
  caption?: string;
  step?: number;
  stepper?: boolean;
  minWidth?: number;
  /** Short service names for the catalog ids used in node.cloud, resolved on the server (see ./diagram.tsx). */
  cloudNames?: Record<string, string>;
}) {
  const spec = DIAGRAMS[name];
  const uid = `dg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const figRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [current, setCurrent] = useState<number | undefined>(step);
  const [cloud, setCloud] = useState<CloudView>("generic");
  const reduced = useReducedMotion();
  const running = inView && playing && !reduced;

  useEffect(() => {
    const el = figRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // SMIL packets are paused through the SVG element; CSS dashes follow data-running.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (running) svg.unpauseAnimations();
    else svg.pauseAnimations();
  }, [running, current]);

  if (!spec) {
    return <p className="text-sm text-muted-foreground">Unknown diagram: {name}</p>;
  }

  const view = buildView(spec, current);
  const steps = spec.steps ?? [];
  const info = current !== undefined ? steps[current - 1] : undefined;
  const added = view.nodes.filter((v) => v.phase === "new").map((v) => v.node.label);
  const label = caption ?? spec.title;
  // The cloud toggle appears on the full design and the stepper, not on single-step figures.
  const showCloud = spec.nodes.some((n) => n.cloud) && (stepper || step === undefined);
  const display = (n: DiagramNode): DiagramNode => {
    const ref = cloud === "generic" ? undefined : n.cloud?.[cloud];
    return ref ? { ...n, label: cloudLabel(ref, cloudNames), sub: n.label } : n;
  };

  return (
    <figure ref={figRef} className="my-10 xl:-mx-24 2xl:-mx-40">
      {showCloud && (
        <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Show services for">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Services</span>
          {CLOUD_VIEWS.map((v) => {
            const on = cloud === v.id;
            return (
              <button
                key={v.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCloud(v.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  on ? "border-transparent text-paper" : "border-hairline text-muted-foreground hover:border-ink hover:text-ink",
                )}
                style={on ? { background: v.tone ? stroke(v.tone) : "var(--ink)" } : undefined}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      )}
      {(current !== undefined || stepper) && (
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {current !== undefined ? `Step ${current} of ${steps.length}` : "Full design"}
          </span>
          <span className="font-semibold text-ink">{info ? info.title : spec.title}</span>
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
        <div
          style={{ minWidth }}
          className="relative rounded-xl border border-hairline bg-paper p-3 sm:p-5"
        >
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
            viewBox={`0 0 ${spec.width} ${spec.height}`}
            role="img"
            aria-label={info ? `${label}: step ${current}, ${info.title}` : label}
            data-running={running}
            className="dg h-auto w-full font-sans"
          >
            <title>{label}</title>
            <Defs uid={uid} />
            {view.zones.map(({ zone, phase }) => (
              <Zone key={zone.id} zone={zone} phase={phase} />
            ))}
            <g>
              {view.edges.map((e, i) => (
                <Edge key={i} {...e} uid={uid} />
              ))}
            </g>
            {view.nodes.map(({ node, phase }) => (
              <Node key={node.id} node={display(node)} phase={phase} />
            ))}
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
          : "border-hairline text-muted-foreground hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Defs({ uid }: { uid: string }) {
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

function Zone({ zone, phase }: { zone: DiagramZone; phase: Phase }) {
  if (zone.kind) return <BoundaryZone zone={zone} phase={phase} />;
  const tabW = zone.title.length * 8.2 + 28;
  return (
    <g opacity={phase === "old" ? 0.6 : 1}>
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
function BoundaryZone({ zone, phase }: { zone: DiagramZone; phase: Phase }) {
  const t = zone.tone;
  const opacity = phase === "old" ? 0.6 : 1;
  if (zone.kind === "subnet") {
    return (
      <g opacity={opacity}>
        <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx={10} style={{ fill: soft(t), stroke: stroke(t) }} strokeWidth={1} strokeOpacity={0.45} />
        <text x={zone.x + 12} y={zone.y + 20} fontSize={11.5} fontWeight={700} letterSpacing={0.6} style={{ fill: stroke(t) }}>
          {zone.title.toUpperCase()}
        </text>
      </g>
    );
  }
  const region = zone.kind === "region";
  const tabW = zone.title.length * 7.6 + 24;
  return (
    <g opacity={opacity}>
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
      <rect x={zone.x + 14} y={zone.y - 12} width={tabW} height={24} rx={6} style={{ fill: region ? "var(--paper)" : stroke(t), stroke: stroke(t) }} strokeWidth={1.2} />
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

// Pulsing outline and "NEW" tag around a node added in the current build step.
function NewMarker({ node }: { node: DiagramNode }) {
  const b = nodeBox(node);
  const pad = 7;
  const x = node.x - b.left - pad;
  const y = node.y - b.top - pad;
  const w = b.left + b.right + pad * 2;
  return (
    <g>
      <rect
        className="dg-new-ring"
        x={x}
        y={y}
        width={w}
        height={b.top + b.bottom + pad * 2}
        rx={14}
        fill="none"
        style={{ stroke: stroke("green") }}
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <rect x={x + w - 40} y={y - 9} width={40} height={18} rx={9} style={{ fill: stroke("green") }} />
      <text x={x + w - 20} y={y + 4} textAnchor="middle" fontSize={10.5} fontWeight={700} letterSpacing={0.6} style={{ fill: "var(--paper)" }}>
        NEW
      </text>
    </g>
  );
}

function Node({ node, phase }: { node: DiagramNode; phase: Phase }) {
  return (
    <g opacity={phase === "old" ? 0.6 : 1}>
      {phase === "new" && <NewMarker node={node} />}
      {node.variant === "glyph" ? <GlyphNode node={node} /> : <CardNode node={node} />}
    </g>
  );
}

function GlyphNode({ node }: { node: DiagramNode }) {
  const tone = node.tone ?? "neutral";
  const top = node.y + GLYPH_SIZE / 2;
  return (
    <g>
      {isGlyph(node.icon) && <Glyph name={node.icon} tone={tone} cx={node.x} cy={node.y} size={GLYPH_SIZE} />}
      <text x={node.x} y={top + 17} textAnchor="middle" fontSize={13.5} fontWeight={600} style={{ fill: "var(--ink)" }}>
        {node.label}
      </text>
      {node.sub && (
        <text x={node.x} y={top + 32} textAnchor="middle" fontSize={11.5} style={{ fill: "var(--muted-foreground)" }}>
          {node.sub}
        </text>
      )}
    </g>
  );
}

function CardNode({ node }: { node: DiagramNode }) {
  const w = node.w ?? NODE_W;
  const h = node.h ?? NODE_H;
  const tone = node.tone ?? "neutral";
  const x = node.x - w / 2;
  const y = node.y - h / 2;
  const glyph = isGlyph(node.icon) ? node.icon : undefined;
  const Icon = !glyph && node.icon ? DIAGRAM_ICONS[node.icon] ?? getIconComponent(node.icon) : undefined;
  const hasIcon = !!glyph || !!Icon;
  const textX = hasIcon ? x + 52 : node.x;
  const anchor = hasIcon ? "start" : "middle";
  const ink = node.accent ? "var(--paper)" : "var(--ink)";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        style={{ fill: node.accent ? stroke(tone) : "var(--paper)", stroke: stroke(tone) }}
        strokeWidth={1.5}
      />
      {(node.accent || Icon) && (
        <rect
          x={x + 8}
          y={node.y - 18}
          width={36}
          height={36}
          rx={9}
          style={{ fill: node.accent ? "var(--paper)" : soft(tone) }}
        />
      )}
      {glyph && <Glyph name={glyph} tone={tone} cx={x + 26} cy={node.y} size={node.accent ? 30 : 36} />}
      {Icon && <Icon x={x + 15} y={node.y - 11} width={22} height={22} style={{ color: stroke(tone) }} />}
      <text
        x={textX}
        y={node.sub ? node.y - 3 : node.y + 4.5}
        textAnchor={anchor}
        fontSize={13.5}
        fontWeight={600}
        style={{ fill: ink }}
      >
        {node.label}
      </text>
      {node.sub && (
        <text
          x={textX}
          y={node.y + 13}
          textAnchor={anchor}
          fontSize={11.5}
          style={{ fill: node.accent ? "var(--paper)" : "var(--muted-foreground)" }}
        >
          {node.sub}
        </text>
      )}
    </g>
  );
}

function Edge({
  edge,
  from,
  to,
  phase,
  delay,
  uid,
}: {
  edge: DiagramEdge;
  from: DiagramNode;
  to: DiagramNode;
  phase: Phase;
  delay: number;
  uid: string;
}) {
  const tone = edge.tone ?? "neutral";
  const points = edgePoints(edge, from, to);
  const d = pathD(points);
  const marker = `url(#${uid}-arrow-${tone})`;
  const dur = `${edge.duration ?? 2.4}s`;
  const begin = `${delay}s`;
  const [lx, ly] = pointAt(points, edge.labelAt ?? 0.5);
  const moving = phase !== "old";

  return (
    <g opacity={phase === "old" ? 0.5 : 1}>
      <path
        d={d}
        fill="none"
        style={{ stroke: stroke(tone) }}
        strokeWidth={phase === "new" ? 2 : 1.6}
        strokeDasharray={edge.dashed || edge.flow ? "6 5" : undefined}
        strokeLinejoin="round"
        markerEnd={marker}
        markerStart={edge.bidirectional ? marker : undefined}
        className={edge.flow && moving ? "dg-flow" : undefined}
      />
      {edge.packet && moving && (
        <g className="dg-packet" opacity={0}>
          <circle r={7} style={{ fill: stroke(tone) }} opacity={0.18} />
          <circle r={3.6} style={{ fill: stroke(tone) }} />
          <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={d} />
          <set attributeName="opacity" to="1" begin={begin} />
        </g>
      )}
      {edge.label && (
        <g>
          <rect
            x={lx - (edge.label.length * 6.3 + 14) / 2}
            y={ly - 10}
            width={edge.label.length * 6.3 + 14}
            height={20}
            rx={10}
            style={{ fill: "var(--paper)", stroke: stroke(tone) }}
            strokeOpacity={0.35}
          />
          <text
            x={lx}
            y={ly + 4}
            textAnchor="middle"
            fontSize={11.5}
            fontWeight={500}
            style={{ fill: stroke(tone) }}
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
}
