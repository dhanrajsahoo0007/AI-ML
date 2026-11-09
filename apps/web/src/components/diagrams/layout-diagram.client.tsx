"use client";

import { layoutView, type Phase } from "./build-view";
import {
  Defs,
  DiagramFigure,
  HighlightRing,
  LabelPill,
  NewRing,
  Packet,
  Zone,
  usePlayback,
} from "./diagram-shared.client";
import { markerUrl, phaseOpacity, soft, stroke } from "./diagram-style";
import { boundsCentre, pathD, pointAt, routeBetween, shapeBounds, type Bounds, type Point } from "./geometry";
import type { LayoutShape, LayoutSpec } from "./types";

interface LayoutDiagramProps {
  spec: LayoutSpec;
  /** Longer description from the asset's sidecar, for screen readers. */
  alt?: string;
  caption?: string;
  step?: number;
  stepper?: boolean;
  minWidth?: number;
  /** Id prefix for SVG defs from the server wrapper (./diagram.tsx). Behind next/dynamic a client-side useId does
   *  not match between SSR and hydration; without it (tests, direct use) the renderer falls back to useId. */
  idBase?: string;
}

// Static drawing for data structures (B-tree pages, hash rings, log segments): boxes, cells, circles, text and
// arrows that appear step by step, with a pulsing ring on the shapes marked `highlight`. No packets unless an
// arrow asks for one. Loaded lazily by ./diagram.tsx.
export function LayoutDiagram({
  spec,
  alt,
  caption,
  step,
  stepper = false,
  minWidth = 560,
  idBase,
}: LayoutDiagramProps) {
  const playback = usePlayback(step, idBase);
  const { current, uid } = playback;
  const view = layoutView(spec, current);
  const byId = new Map(view.shapes.map((v) => [v.shape.id, v.shape]));
  const added = view.shapes.flatMap((v) => (v.phase === "new" && v.shape.label ? [v.shape.label] : []));

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
    >
      <Defs uid={uid} />
      {view.groups.map(({ zone, phase }) => (
        <Zone key={zone.id} zone={zone} phase={phase} />
      ))}
      {view.shapes
        .filter((v) => v.shape.type === "arrow")
        .map((v) => (
          <Arrow key={v.shape.id} shape={v.shape} phase={v.phase} byId={byId} uid={uid} />
        ))}
      {view.shapes
        .filter((v) => v.shape.type !== "arrow")
        .map((v) => (
          <Shape key={v.shape.id} shape={v.shape} phase={v.phase} />
        ))}
    </DiagramFigure>
  );
}

function Shape({ shape, phase }: { shape: LayoutShape; phase: Phase }) {
  const tone = shape.tone ?? "neutral";
  const b = shapeBounds(shape);
  const [cx, cy] = boundsCentre(b);
  const w = b.x2 - b.x1;
  const h = b.y2 - b.y1;
  const rx = shape.type === "cell" ? 4 : 10;
  return (
    <g
      opacity={phaseOpacity(phase)}
      data-shape={shape.id}
      data-phase={phase}
      data-hl={shape.highlight ? "true" : undefined}
    >
      {shape.highlight && <HighlightRing bounds={b} tone={tone} pad={shape.type === "cell" ? 4 : 6} rx={rx + 4} />}
      {phase === "new" && <NewRing bounds={b} pad={shape.type === "cell" ? 4 : 7} />}
      {shape.type === "circle" && (
        <circle
          cx={cx}
          cy={cy}
          r={w / 2}
          style={{ fill: shape.highlight ? stroke(tone) : soft(tone), stroke: stroke(tone) }}
          strokeWidth={1.5}
        />
      )}
      {(shape.type === "box" || shape.type === "cell") && (
        <rect
          x={b.x1}
          y={b.y1}
          width={w}
          height={h}
          rx={rx}
          style={{
            fill: shape.highlight ? stroke(tone) : shape.type === "cell" ? soft(tone) : "var(--paper)",
            stroke: stroke(tone),
          }}
          strokeWidth={1.5}
        />
      )}
      {shape.label && (
        <text
          x={cx}
          y={shape.sub ? cy - 3 : cy + 4.5}
          textAnchor="middle"
          fontSize={shape.type === "text" ? 12.5 : 13}
          fontWeight={shape.type === "text" ? 500 : 600}
          style={{
            fill:
              shape.highlight && shape.type !== "text"
                ? "var(--paper)"
                : shape.type === "text"
                  ? stroke(tone)
                  : "var(--ink)",
          }}
        >
          {shape.label}
        </text>
      )}
      {shape.sub && (
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          fontSize={11}
          style={{ fill: shape.highlight && shape.type !== "text" ? "var(--paper)" : "var(--muted-foreground)" }}
        >
          {shape.sub}
        </text>
      )}
    </g>
  );
}

const pointBounds = ([x, y]: Point): Bounds => ({ x1: x, y1: y, x2: x, y2: y });

// Arrow route: between two shapes' borders, or from/to a free point (x, y) and (x + w, y + h) for the missing end.
function arrowPoints(shape: LayoutShape, byId: Map<string, LayoutShape>): Point[] {
  const from = shape.from ? byId.get(shape.from) : undefined;
  const to = shape.to ? byId.get(shape.to) : undefined;
  const via = shape.via ?? [];
  const start: Point = [shape.x, shape.y];
  const end: Point = [shape.x + (shape.w ?? 0), shape.y + (shape.h ?? 0)];
  if (!from && !to) return [start, ...via, end];
  return routeBetween(from ? shapeBounds(from) : pointBounds(start), to ? shapeBounds(to) : pointBounds(end), via);
}

function Arrow({
  shape,
  phase,
  byId,
  uid,
}: {
  shape: LayoutShape;
  phase: Phase;
  byId: Map<string, LayoutShape>;
  uid: string;
}) {
  const tone = shape.tone ?? "neutral";
  const points = arrowPoints(shape, byId);
  const d = pathD(points);
  const [lx, ly] = pointAt(points, 0.5);
  return (
    <g opacity={phaseOpacity(phase, 0.5)} data-shape={shape.id} data-phase={phase}>
      <path
        d={d}
        fill="none"
        style={{ stroke: stroke(tone) }}
        strokeWidth={phase === "new" ? 2.2 : 1.6}
        strokeDasharray={shape.dashed ? "6 5" : undefined}
        strokeLinejoin="round"
        markerEnd={markerUrl(uid, tone)}
      />
      {shape.packet && phase !== "old" && <Packet d={d} tone={tone} begin={0} dur={2} />}
      {shape.label && <LabelPill x={lx} y={ly} text={shape.label} tone={tone} />}
    </g>
  );
}
