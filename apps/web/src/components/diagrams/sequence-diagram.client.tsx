"use client";

import type { Phase } from "./build-view";
import { Defs, DiagramFigure, IconAt, NewRing, Packet, usePlayback } from "./diagram-shared.client";
import { markerUrl, phaseOpacity, soft, stroke, toneText } from "./diagram-style";
import type { Bounds } from "./geometry";
import { placeNewTags, textBounds, type Obstacles, type TagSpot } from "./new-tags";
import { SEQ, layoutSequence, type LaneView, type MessageTiming, type SequenceView } from "./sequence-layout";
import { FONTS, measureText } from "./text-width";
import type { SequenceMessage, SequenceNote, SequenceSpec, Tone } from "./types";

interface SequenceDiagramProps {
  spec: SequenceSpec;
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

// Sequence diagram: one lifeline per lane, messages as horizontal arrows drawn top to bottom, with a packet
// crossing each arrow in turn. Shares the step header, stepper, play/pause and reduced-motion handling with the
// architecture renderer (./diagram-shared.client.tsx). Loaded lazily by ./diagram.tsx.
export function SequenceDiagram({
  spec,
  alt,
  caption,
  step,
  stepper = false,
  minWidth = 560,
  idBase,
}: SequenceDiagramProps) {
  const playback = usePlayback(step, idBase);
  const { current, uid } = playback;
  const view = layoutSequence(spec, current);
  const tags = sequenceTags(view);
  const lifelineTop = SEQ.headerY + SEQ.headerH;
  const lifelineBottom = view.height - 12;
  const added = view.rows
    .filter((r) => r.phase === "new")
    .map((r) => (r.kind === "message" ? r.message.label : r.note.text))
    .filter((s): s is string => !!s);

  return (
    <DiagramFigure
      playback={playback}
      title={spec.title}
      alt={alt}
      caption={caption}
      steps={spec.steps}
      stepper={stepper}
      added={added}
      width={view.width}
      height={view.height}
      minWidth={minWidth}
    >
      <Defs uid={uid} />
      {view.lanes.map((lane) => (
        <Lane key={lane.id} lane={lane} top={lifelineTop} bottom={lifelineBottom} />
      ))}
      {view.rows.map((row) =>
        row.kind === "message" ? (
          <Message
            key={`m${row.index}`}
            message={row.message}
            y={row.y}
            phase={row.phase}
            laneX={view.laneX}
            timing={view.timing.get(row.index)}
            cycle={view.cycle}
            uid={uid}
            tag={tags.get(`m${row.index}`)}
          />
        ) : (
          <Note
            key={`n${row.index}`}
            note={row.note}
            y={row.y}
            phase={row.phase}
            laneX={view.laneX}
            width={view.width}
            tag={tags.get(`n${row.index}`)}
          />
        )
      )}
    </DiagramFigure>
  );
}

/** Header width of a lane: the label plus its icon, between SEQ.headerMinW and SEQ.headerMaxW. */
const laneHeaderWidth = (lane: { label: string; icon?: string }) =>
  Math.max(SEQ.headerMinW, Math.min(SEQ.headerMaxW, measureText(lane.label, FONTS.label) + (lane.icon ? 64 : 28)));

/**
 * Where a message draws: `box` is what its NEW ring surrounds (the note box for a note, else the arrow row), `label`
 * the paper box behind its label, `text` the label's own text.
 */
function messageGeometry(message: SequenceMessage, y: number, laneX: Map<string, number>) {
  const x1 = laneX.get(message.from) ?? 0;
  const x2 = laneX.get(message.to) ?? 0;
  const self = message.from === message.to;
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  if (message.kind === "note") {
    const w = self ? Math.max(120, measureText(message.label ?? "", FONTS.note) + 24) : right - left + 40;
    const x = self ? x1 + 12 : left - 20;
    const box: Bounds = { x1: x, y1: y - 14, x2: x + w, y2: y + 14 };
    return {
      box,
      label: undefined,
      text: message.label ? [textBounds(message.label, FONTS.note, x + w / 2, y + 4)] : [],
    };
  }
  const box: Bounds = { x1: left - 4, y1: y - 20, x2: right + (self ? 60 : 4), y2: y + 14 };
  if (!message.label) return { box, label: undefined, text: [] };
  const labelY = self ? y - 1 : y - 9;
  const labelW = measureText(message.label, FONTS.message) + 12;
  // A self message's label sits right of its loop; any other label is centred over the arrow.
  const labelX = self ? x1 + 52 : (x1 + x2) / 2 - labelW / 2;
  const label: Bounds = { x1: labelX, y1: labelY - 10, x2: labelX + labelW, y2: labelY + 8 };
  return { box, label, text: [label] };
}

/** A note's box: right of its lifeline, or left of it when that would run off the canvas. */
function noteBox(note: SequenceNote, y: number, laneX: Map<string, number>, width: number): Bounds {
  const lx = laneX.get(note.lane) ?? 0;
  const w = Math.max(80, measureText(note.text, FONTS.note) + 22);
  const x = lx + 14 + w <= width - 4 ? lx + 14 : Math.max(4, lx - 14 - w);
  return { x1: x, y1: y - 13, x2: x + w, y2: y + 13 };
}

/** NEW tag spots for a sequence step view, keyed m<index> (messages) and n<index> (notes). */
function sequenceTags(view: SequenceView): Map<string, TagSpot> {
  const fresh: { key: string; box: Bounds; text: Bounds[]; pad: number }[] = [];
  const obstacles: Obstacles = {
    boxes: view.lanes.map((l) => {
      const w = laneHeaderWidth(l);
      return { x1: l.x - w / 2, y1: SEQ.headerY, x2: l.x + w / 2, y2: SEQ.headerY + SEQ.headerH };
    }),
    text: [],
  };
  for (const row of view.rows) {
    const g =
      row.kind === "message"
        ? messageGeometry(row.message, row.y, view.laneX)
        : { box: noteBox(row.note, row.y, view.laneX, view.width), label: undefined, text: [] };
    const solid = row.kind === "note" || row.message.kind === "note" ? [g.box] : g.label ? [g.label] : [];
    if (row.phase === "new") {
      const pad = row.kind === "message" && row.message.kind !== "note" ? 2 : 4;
      fresh.push({
        key: `${row.kind === "message" ? "m" : "n"}${row.index}`,
        box: g.box,
        text: [...g.text, ...solid],
        pad,
      });
    } else {
      obstacles.text.push(...solid, ...g.text);
    }
  }
  if (!fresh.length) return new Map();
  const grow = (b: Bounds, p: number) => ({ x1: b.x1 - p, y1: b.y1 - p, x2: b.x2 + p, y2: b.y2 + p });
  const spots = placeNewTags(
    fresh.map((f) => ({ ring: grow(f.box, f.pad), text: f.text })),
    obstacles,
    view.width,
    view.height
  );
  return new Map(fresh.map((f, i) => [f.key, spots[i]]));
}

function Lane({ lane, top, bottom }: { lane: LaneView; top: number; bottom: number }) {
  const tone = lane.tone ?? "neutral";
  const w = laneHeaderWidth(lane);
  const x = lane.x - w / 2;
  const textX = lane.icon ? x + 46 : lane.x;
  return (
    <g data-lane={lane.id}>
      <line
        x1={lane.x}
        y1={top}
        x2={lane.x}
        y2={bottom}
        style={{ stroke: stroke(tone) }}
        strokeWidth={1.2}
        strokeDasharray="4 5"
        strokeOpacity={0.6}
      />
      <rect
        x={x}
        y={SEQ.headerY}
        width={w}
        height={SEQ.headerH}
        rx={10}
        style={{ fill: "var(--paper)", stroke: stroke(tone) }}
        strokeWidth={1.5}
      />
      {lane.icon && (
        <>
          <rect x={x + 8} y={SEQ.headerY + 10} width={36} height={36} rx={9} style={{ fill: soft(tone) }} />
          <IconAt name={lane.icon} tone={tone} cx={x + 26} cy={SEQ.headerY + SEQ.headerH / 2} size={36} />
        </>
      )}
      <text
        x={textX}
        y={SEQ.headerY + SEQ.headerH / 2 + 4.5}
        textAnchor={lane.icon ? "start" : "middle"}
        fontSize={13.5}
        fontWeight={600}
        style={{ fill: "var(--ink)" }}
      >
        {lane.label}
      </text>
    </g>
  );
}

function Message({
  message,
  y,
  phase,
  laneX,
  timing,
  cycle,
  uid,
  tag,
}: {
  message: SequenceMessage;
  y: number;
  phase: Phase;
  laneX: Map<string, number>;
  timing: MessageTiming | undefined;
  cycle: number;
  uid: string;
  tag: TagSpot | undefined;
}) {
  const kind = message.kind ?? "call";
  const x1 = laneX.get(message.from) ?? 0;
  const x2 = laneX.get(message.to) ?? 0;
  const tone: Tone = kind === "timeout" ? "red" : kind === "return" ? "neutral" : "blue";
  const dashed = kind === "return" || kind === "async";
  const self = message.from === message.to;
  const key = `${message.from}>${message.to}`;

  const geo = messageGeometry(message, y, laneX);
  if (kind === "note") {
    const { x1: x, x2 } = geo.box;
    const w = x2 - x;
    return (
      <g opacity={phaseOpacity(phase)} data-message={key} data-kind="note" data-phase={phase}>
        {phase === "new" && <NewRing bounds={geo.box} pad={4} tag={tag} />}
        <rect
          x={x}
          y={y - 14}
          width={w}
          height={28}
          rx={6}
          style={{ fill: soft("orange"), stroke: stroke("orange") }}
        />
        <text x={x + w / 2} y={y + 4} textAnchor="middle" fontSize={11.5} style={{ fill: "var(--ink)" }}>
          {message.label}
        </text>
      </g>
    );
  }

  // Self message: a small loop out to the right and back.
  const d = self
    ? `M${x1.toFixed(1)} ${(y - 12).toFixed(1)} L${(x1 + 46).toFixed(1)} ${(y - 12).toFixed(1)} L${(x1 + 46).toFixed(1)} ${(y + 10).toFixed(1)} L${(x1 + 6).toFixed(1)} ${(y + 10).toFixed(1)}`
    : `M${x1.toFixed(1)} ${y.toFixed(1)} L${x2.toFixed(1)} ${y.toFixed(1)}`;
  const mid = (x1 + x2) / 2;
  const labelY = self ? y - 1 : y - 9;
  const moving = phase !== "old" && !!timing;
  const labelX = geo.label?.x1 ?? 0;
  const labelW = geo.label ? geo.label.x2 - geo.label.x1 : 0;

  return (
    <g opacity={phaseOpacity(phase)} data-message={key} data-kind={kind} data-phase={phase}>
      {phase === "new" && <NewRing bounds={geo.box} pad={2} tag={tag} />}
      <path
        d={d}
        fill="none"
        style={{ stroke: stroke(tone) }}
        strokeWidth={phase === "new" ? 2 : 1.6}
        strokeDasharray={dashed ? "6 5" : undefined}
        strokeLinejoin="round"
        markerEnd={markerUrl(uid, tone)}
      />
      {kind === "timeout" && !self && (
        <g className="dg-timeout">
          <rect
            x={Math.min(x1, x2) + 8}
            y={y - 6}
            width={Math.abs(x2 - x1) - 16}
            height={12}
            rx={6}
            style={{ fill: stroke("red") }}
          />
          <text
            x={mid}
            y={y + 22}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight={700}
            letterSpacing={0.6}
            style={{ fill: toneText("red") }}
          >
            TIMEOUT
          </text>
        </g>
      )}
      {message.label && (
        <g>
          <rect x={labelX} y={labelY - 10} width={labelW} height={18} rx={5} style={{ fill: "var(--paper)" }} />
          <text
            x={self ? labelX + 6 : mid}
            y={labelY + 3}
            textAnchor={self ? "start" : "middle"}
            fontSize={11.5}
            fontWeight={500}
            style={{ fill: kind === "return" ? "var(--muted-foreground)" : toneText(tone) }}
          >
            {message.label}
          </text>
        </g>
      )}
      {moving && timing && <Packet d={d} tone={tone} begin={timing.begin} dur={timing.duration} cycle={cycle} />}
    </g>
  );
}

function Note({
  note,
  y,
  phase,
  laneX,
  width,
  tag,
}: {
  note: SequenceNote;
  y: number;
  phase: Phase;
  laneX: Map<string, number>;
  width: number;
  tag: TagSpot | undefined;
}) {
  const box = noteBox(note, y, laneX, width);
  const x = box.x1;
  const w = box.x2 - box.x1;
  return (
    <g opacity={phaseOpacity(phase)} data-note={note.lane} data-phase={phase}>
      {phase === "new" && <NewRing bounds={box} pad={4} tag={tag} />}
      <path
        d={`M${x} ${y - 13} H${x + w - 8} L${x + w} ${y - 5} V${y + 13} H${x} Z`}
        style={{ fill: soft("orange"), stroke: stroke("orange") }}
        strokeWidth={1.2}
      />
      <text x={x + 11} y={y + 4} fontSize={11.5} style={{ fill: "var(--ink)" }}>
        {note.text}
      </text>
    </g>
  );
}
