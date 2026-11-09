"use client";

import type { Phase } from "./build-view";
import { Defs, DiagramFigure, IconAt, NewRing, Packet, usePlayback } from "./diagram-shared.client";
import { markerUrl, phaseOpacity, soft, stroke, textWidth } from "./diagram-style";
import { SEQ, layoutSequence, type LaneView, type MessageTiming } from "./sequence-layout";
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
          />
        ) : (
          <Note
            key={`n${row.index}`}
            note={row.note}
            y={row.y}
            phase={row.phase}
            laneX={view.laneX}
            width={view.width}
          />
        )
      )}
    </DiagramFigure>
  );
}

function Lane({ lane, top, bottom }: { lane: LaneView; top: number; bottom: number }) {
  const tone = lane.tone ?? "neutral";
  const w = Math.max(96, Math.min(150, textWidth(lane.label, 7.4) + (lane.icon ? 64 : 28)));
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
}: {
  message: SequenceMessage;
  y: number;
  phase: Phase;
  laneX: Map<string, number>;
  timing: MessageTiming | undefined;
  cycle: number;
  uid: string;
}) {
  const kind = message.kind ?? "call";
  const x1 = laneX.get(message.from) ?? 0;
  const x2 = laneX.get(message.to) ?? 0;
  const tone: Tone = kind === "timeout" ? "red" : kind === "return" ? "neutral" : "blue";
  const dashed = kind === "return" || kind === "async";
  const self = message.from === message.to;
  const key = `${message.from}>${message.to}`;

  if (kind === "note") {
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const w = self ? Math.max(120, textWidth(message.label ?? "") + 24) : right - left + 40;
    const x = self ? x1 + 12 : left - 20;
    return (
      <g opacity={phaseOpacity(phase)} data-message={key} data-kind="note" data-phase={phase}>
        {phase === "new" && <NewRing bounds={{ x1: x, y1: y - 14, x2: x + w, y2: y + 14 }} pad={4} />}
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
  const labelW = message.label ? textWidth(message.label) + 12 : 0;
  // A self message's label sits right of its loop; any other label is centred over the arrow.
  const labelX = self ? x1 + 52 : mid - labelW / 2;

  return (
    <g opacity={phaseOpacity(phase)} data-message={key} data-kind={kind} data-phase={phase}>
      {phase === "new" && (
        <NewRing
          bounds={{ x1: Math.min(x1, x2) - 4, y1: y - 20, x2: Math.max(x1, x2) + (self ? 60 : 4), y2: y + 14 }}
          pad={2}
        />
      )}
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
            style={{ fill: stroke("red") }}
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
            style={{ fill: kind === "return" ? "var(--muted-foreground)" : stroke(tone) }}
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
}: {
  note: SequenceNote;
  y: number;
  phase: Phase;
  laneX: Map<string, number>;
  width: number;
}) {
  const lx = laneX.get(note.lane) ?? 0;
  const w = Math.max(80, textWidth(note.text) + 22);
  // Right of the lifeline, or left of it when that would run off the canvas.
  const x = lx + 14 + w <= width - 4 ? lx + 14 : Math.max(4, lx - 14 - w);
  return (
    <g opacity={phaseOpacity(phase)} data-note={note.lane} data-phase={phase}>
      {phase === "new" && <NewRing bounds={{ x1: x, y1: y - 13, x2: x + w, y2: y + 13 }} pad={4} />}
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
