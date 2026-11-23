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
import { LAYOUT_ONLY_TONES, TONES, markerUrl, pastel, phaseOpacity, soft, stroke, toneText } from "./diagram-style";
import { arrowPoints, boundsCentre, pathD, pointAt, shapeBounds, smoothPathD, type Point } from "./geometry";
import { layoutTags, shapeRingPad, type TagSpot } from "./new-tags";
import type { LayoutShape, LayoutSpec, LayoutTone } from "./types";

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

// Static drawing for data structures (B-tree pages, hash rings, log segments) and paper-style figures (the
// Transformer): boxes, cells, circles, text, arrows and paths that appear step by step, with a pulsing ring on the
// shapes marked `highlight`. No packets unless an arrow asks for one. Loaded lazily by ./diagram.tsx.
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
  const tags = layoutTags(view, spec.width, spec.height);
  const added = view.shapes.flatMap((v) =>
    v.phase === "new" && v.shape.label && !v.shape.quiet ? [v.shape.label.replace(/\n/g, " ")] : []
  );
  // Arrow markers for the layout-only tones, added only when the spec uses them so other diagrams keep their defs.
  const extra = LAYOUT_ONLY_TONES.filter(
    (t) => spec.shapes.some((s) => s.tone === t) || (spec.groups ?? []).some((g) => g.tone === t)
  );

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
      <Defs uid={uid} tones={extra.length ? [...TONES, ...extra] : undefined} />
      {view.groups.map(({ zone, phase }) => (
        <Zone key={zone.id} zone={zone} phase={phase} />
      ))}
      {view.shapes
        .filter((v) => isLine(v.shape))
        .map((v) =>
          v.shape.type === "path" ? (
            <PathLine key={v.shape.id} shape={v.shape} phase={v.phase} uid={uid} />
          ) : (
            <Arrow key={v.shape.id} shape={v.shape} phase={v.phase} byId={byId} uid={uid} />
          )
        )}
      {view.shapes
        .filter((v) => !isLine(v.shape))
        .map((v) => (
          <Shape key={v.shape.id} shape={v.shape} phase={v.phase} tag={tags.get(v.shape.id)} />
        ))}
    </DiagramFigure>
  );
}

const isLine = (s: LayoutShape) => s.type === "arrow" || s.type === "path";

/** Line height of multi-line labels. */
const LINE_H = 15;

function fillOf(shape: LayoutShape, tone: LayoutTone) {
  // A highlighted shape carries paper text, so its solid fill is the AA-safe text tone, not the stroke.
  if (shape.highlight) return toneText(tone);
  const fill = shape.fill ?? (shape.type === "box" ? "paper" : "soft");
  return fill === "paper" ? "var(--paper)" : fill === "pastel" ? pastel(tone) : soft(tone);
}

function Shape({ shape, phase, tag }: { shape: LayoutShape; phase: Phase; tag: TagSpot | undefined }) {
  const tone = shape.tone ?? "neutral";
  const b = shapeBounds(shape);
  const [cx, cy] = boundsCentre(b);
  const w = b.x2 - b.x1;
  const h = b.y2 - b.y1;
  const rx = shape.type === "cell" ? 4 : 10;
  const weighted = shape.type === "cell" && shape.weight !== undefined && !shape.highlight;
  // A weighted cell keeps ink text: its opacity is capped per theme (--dg-weight-scale) so ink stays readable.
  const onDark = shape.highlight && shape.type !== "text";
  const pastelFill = !shape.highlight && shape.fill === "pastel";
  const lines = shape.label && !shape.symbol ? shape.label.split("\n") : [];
  // Multi-line labels stay centred: the block moves up by half its extra height, the sub line down by as much.
  const shift = ((lines.length - 1) * LINE_H) / 2;
  const labelY = (shape.sub ? cy - 3 : cy + 4.5) - shift;
  return (
    <g
      opacity={phaseOpacity(phase)}
      data-shape={shape.id}
      data-phase={phase}
      data-hl={shape.highlight ? "true" : undefined}
    >
      {shape.highlight && <HighlightRing bounds={b} tone={tone} pad={shape.type === "cell" ? 4 : 6} rx={rx + 4} />}
      {phase === "new" && !shape.quiet && <NewRing bounds={b} pad={shapeRingPad(shape)} tag={tag} />}
      {shape.type === "circle" && (
        <circle
          cx={cx}
          cy={cy}
          r={w / 2}
          style={{ fill: fillOf(shape, tone), stroke: stroke(tone) }}
          strokeWidth={1.5}
        />
      )}
      {shape.type === "circle" && shape.symbol && (
        <path
          d={symbolD(shape.symbol, cx, cy, w / 2)}
          fill="none"
          style={{ stroke: shape.highlight ? "var(--paper)" : stroke(tone) }}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          data-symbol={shape.symbol}
        />
      )}
      {weighted && <rect x={b.x1} y={b.y1} width={w} height={h} rx={rx} style={{ fill: "var(--paper)" }} />}
      {(shape.type === "box" || shape.type === "cell") && (
        <rect
          x={b.x1}
          y={b.y1}
          width={w}
          height={h}
          rx={rx}
          style={{
            fill: weighted ? stroke(tone) : fillOf(shape, tone),
            stroke: stroke(tone),
            fillOpacity: weighted ? `calc(${shape.weight} * var(--dg-weight-scale, 0.8))` : undefined,
          }}
          strokeWidth={1.5}
          data-weight={weighted ? shape.weight : undefined}
        />
      )}
      {lines.length > 0 && (
        <text
          x={cx}
          y={labelY}
          textAnchor="middle"
          fontSize={shape.type === "text" ? 12.5 : 13}
          fontWeight={shape.type === "text" ? 500 : 600}
          style={{
            fill: onDark ? "var(--paper)" : shape.type === "text" ? toneText(tone) : "var(--ink)",
          }}
        >
          {lines.length === 1
            ? lines[0]
            : lines.map((line, i) => (
                <tspan key={i} x={cx} y={labelY + i * LINE_H}>
                  {line}
                </tspan>
              ))}
        </text>
      )}
      {shape.sub && (
        <text
          x={cx}
          y={cy + 13 + shift}
          textAnchor="middle"
          fontSize={11}
          style={{ fill: onDark ? "var(--paper)" : pastelFill ? "var(--ink)" : "var(--muted-foreground)" }}
        >
          {shape.sub}
        </text>
      )}
    </g>
  );
}

/** The drawing inside a circle of radius r centred on (cx, cy). */
function symbolD(symbol: NonNullable<LayoutShape["symbol"]>, cx: number, cy: number, r: number) {
  const s = r * 0.55;
  if (symbol === "plus") return `M${cx - s} ${cy} H${cx + s} M${cx} ${cy - s} V${cy + s}`;
  if (symbol === "times") {
    const d = s * Math.SQRT1_2;
    return `M${cx - d} ${cy - d} L${cx + d} ${cy + d} M${cx - d} ${cy + d} L${cx + d} ${cy - d}`;
  }
  // One period of a sine wave across the circle.
  const n = 24;
  const pts: Point[] = Array.from({ length: n + 1 }, (_, i) => [
    cx - s * 1.15 + (2.3 * s * i) / n,
    cy - s * 0.7 * Math.sin((2 * Math.PI * i) / n),
  ]);
  return pathD(pts);
}

/** A free line through `points`: brackets, braces, attention arcs, curves sampled from a formula. */
function PathLine({ shape, phase, uid }: { shape: LayoutShape; phase: Phase; uid: string }) {
  const tone = shape.tone ?? "neutral";
  const points = shape.points ?? [];
  const weight = shape.weight;
  return (
    <g opacity={phaseOpacity(phase, 0.5)} data-shape={shape.id} data-phase={phase}>
      <path
        d={shape.smooth ? smoothPathD(points) : pathD(points)}
        fill="none"
        style={{ stroke: stroke(tone) }}
        strokeWidth={weight === undefined ? (phase === "new" ? 2.2 : 1.6) : 1 + 3 * weight}
        strokeOpacity={weight === undefined ? undefined : 0.25 + 0.75 * weight}
        strokeDasharray={shape.dashed ? "6 5" : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={shape.head ? markerUrl(uid, tone) : undefined}
      />
    </g>
  );
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
        markerEnd={shape.head === false ? undefined : markerUrl(uid, tone)}
      />
      {shape.packet && phase !== "old" && <Packet d={d} tone={tone} begin={0} dur={2} />}
      {shape.label && <LabelPill x={lx} y={ly} text={shape.label} tone={tone} />}
    </g>
  );
}
