"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildView,
  edgeEmphasised,
  nodeEmphasised,
  parseEmphasis,
  zoneEmphasised,
  type Emphasis,
  type Phase,
} from "./build-view";
import {
  DIAGRAM_ICONS,
  Defs,
  DiagramFigure,
  HighlightRing,
  NewRing,
  Packet,
  LabelPill,
  Zone,
  usePlayback,
} from "./diagram-shared.client";
import { markerUrl, phaseOpacity, soft, stroke } from "./diagram-style";
import { GLYPH_SIZE, NODE_H, NODE_W, edgePoints, nodeBounds, pathD, pointAt } from "./geometry";
import { Glyph, isGlyph } from "./glyphs";
import { getIconComponent } from "@/lib/icons";
import {
  isCloudProvider,
  type CloudProvider,
  type CloudRef,
  type DiagramEdge,
  type DiagramNode,
  type DiagramSpec,
  type Tone,
} from "./types";

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
  return typeof ref === "string" ? (names[ref] ?? ref) : ref.label;
}

export interface AnimatedDiagramProps {
  spec: DiagramSpec;
  /** Longer description from the asset's sidecar, for screen readers. */
  alt?: string;
  caption?: string;
  step?: number;
  stepper?: boolean;
  minWidth?: number;
  /** Node ids to keep bright; everything else dims. */
  highlight?: string[];
  /** Node ids joined by ">" ("client>lb>cache"): those nodes and the edges between them stay bright. */
  path?: string;
  /**
   * Provider the Services toggle starts on (default: Generic), for specs whose nodes carry `cloud` refs. It is the
   * initial state, so the server render already shows that provider's names; the reader can still switch. With
   * `step` alone there is no toggle and the figure stays on this provider. The wrapper (./diagram.tsx) rejects
   * other values; used directly, anything else falls back to Generic.
   */
  cloud?: CloudProvider;
  /** Short service names for the catalog ids used in node.cloud, resolved on the server (see ./diagram.tsx). */
  cloudNames?: Record<string, string>;
  /** Id prefix for SVG defs from the server wrapper (./diagram.tsx). Behind next/dynamic a client-side useId does
   *  not match between SSR and hydration; without it (tests, direct use) the renderer falls back to useId. */
  idBase?: string;
}

// Architecture diagram drawn from a spec (assets/diagrams/animated, resolved by ./diagram.tsx), with marching
// dashes and packets travelling along the edges. `step` draws the design as it stands after that build step,
// highlighting what the step added; `stepper` adds controls to walk through every step. Animation runs only on
// screen and not for reduced motion.
export function AnimatedDiagram({
  spec,
  alt,
  caption,
  step,
  stepper = false,
  minWidth,
  highlight,
  path,
  cloud: initialCloud,
  cloudNames = {},
  idBase,
}: AnimatedDiagramProps) {
  const playback = usePlayback(step, idBase);
  const { current, uid } = playback;
  const [cloud, setCloud] = useState<CloudView>(isCloudProvider(initialCloud) ? initialCloud : "generic");

  const view = buildView(spec, current);
  const emphasis = parseEmphasis(highlight, path);
  const added = view.nodes.filter((v) => v.phase === "new").map((v) => v.node.label);
  // The cloud toggle appears on the full design and the stepper, not on single-step figures.
  const showCloud = spec.nodes.some((n) => n.cloud) && (stepper || step === undefined);
  const display = (n: DiagramNode): DiagramNode => {
    const ref = cloud === "generic" ? undefined : n.cloud?.[cloud];
    return ref ? { ...n, label: cloudLabel(ref, cloudNames), sub: n.label } : n;
  };
  const shownNodes = view.nodes.map((v) => v.node);

  return (
    <DiagramFigure
      playback={playback}
      title={spec.title}
      alt={alt}
      caption={caption}
      steps={spec.steps}
      stepper={stepper}
      added={added}
      width={spec.width}
      height={spec.height}
      minWidth={minWidth}
      toolbar={showCloud ? <CloudToggle cloud={cloud} setCloud={setCloud} /> : undefined}
    >
      <Defs uid={uid} />
      {view.zones.map(({ zone, phase }) => (
        <Zone key={zone.id} zone={zone} phase={phase} dim={!zoneEmphasised(emphasis, zone, shownNodes)} />
      ))}
      <g>
        {view.edges.map((e, i) => (
          <Edge key={i} {...e} uid={uid} emphasis={emphasis} />
        ))}
      </g>
      {view.nodes.map(({ node, phase }) => (
        <Node key={node.id} node={display(node)} phase={phase} emphasis={emphasis} />
      ))}
    </DiagramFigure>
  );
}

function CloudToggle({ cloud, setCloud }: { cloud: CloudView; setCloud: (c: CloudView) => void }) {
  return (
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
              on
                ? "border-transparent text-paper"
                : "border-hairline text-muted-foreground hover:border-ink hover:text-ink"
            )}
            style={on ? { background: v.tone ? stroke(v.tone) : "var(--ink)" } : undefined}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

function Node({ node, phase, emphasis }: { node: DiagramNode; phase: Phase; emphasis: Emphasis | undefined }) {
  const bright = nodeEmphasised(emphasis, node.id);
  const ringed = !!emphasis && bright;
  return (
    <g
      opacity={phaseOpacity(phase)}
      className={bright ? undefined : "dg-dim"}
      data-node={node.id}
      data-dim={bright ? undefined : "true"}
      data-hl={ringed ? "true" : undefined}
    >
      {ringed && <HighlightRing bounds={nodeBounds(node)} tone={node.tone ?? "neutral"} />}
      {phase === "new" && <NewRing bounds={nodeBounds(node)} />}
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
  const Icon = !glyph && node.icon ? (DIAGRAM_ICONS[node.icon] ?? getIconComponent(node.icon)) : undefined;
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
  emphasis,
}: {
  edge: DiagramEdge;
  from: DiagramNode;
  to: DiagramNode;
  phase: Phase;
  delay: number;
  uid: string;
  emphasis: Emphasis | undefined;
}) {
  const tone = edge.tone ?? "neutral";
  const points = edgePoints(edge, from, to);
  const d = pathD(points);
  const marker = markerUrl(uid, tone);
  const [lx, ly] = pointAt(points, edge.labelAt ?? 0.5);
  const moving = phase !== "old";
  const bright = edgeEmphasised(emphasis, edge.from, edge.to);
  // On a path the edges are the story: a little heavier than a plain full-diagram edge.
  const onPath = !!emphasis?.hasPath && bright;

  return (
    <g
      opacity={phaseOpacity(phase, 0.5)}
      className={bright ? undefined : "dg-dim"}
      data-edge={`${edge.from}>${edge.to}`}
      data-dim={bright ? undefined : "true"}
      data-hl={onPath ? "true" : undefined}
    >
      <path
        d={d}
        fill="none"
        style={{ stroke: stroke(tone) }}
        strokeWidth={phase === "new" || onPath ? 2.2 : 1.6}
        strokeDasharray={edge.dashed || edge.flow ? "6 5" : undefined}
        strokeLinejoin="round"
        markerEnd={marker}
        markerStart={edge.bidirectional ? marker : undefined}
        className={edge.flow && moving ? "dg-flow" : undefined}
      />
      {edge.packet && moving && <Packet d={d} tone={tone} begin={delay} dur={edge.duration ?? 2.4} />}
      {edge.label && <LabelPill x={lx} y={ly} text={edge.label} tone={tone} />}
    </g>
  );
}
