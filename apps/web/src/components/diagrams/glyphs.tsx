import type { ReactNode } from "react";
import type { Tone } from "./types";

// Illustrated icons for diagram nodes, drawn in a 48 x 48 box and coloured by tone: a cylinder for a
// database, stacked layers for a cache, a segmented tube for a log or queue. Same visual language as
// the Excalidraw libraries in design/excalidraw-libraries, drawn from scratch.

export type GlyphName =
  | "database"
  | "cache"
  | "queue"
  | "blob"
  | "cdn"
  | "load-balancer"
  | "phone"
  | "server"
  | "chat"
  | "registry"
  | "presence"
  | "bell"
  | "workers"
  | "users"
  | "gateway"
  | "media"
  | "history"
  | "bag"
  | "card";

const ink = (t: Tone) => `var(--dg-${t})`;
const soft = (t: Tone) => `var(--dg-${t}-soft)`;
const PAPER = "var(--paper)";

const GLYPHS: Record<GlyphName, (t: Tone) => ReactNode> = {
  database: (t) => (
    <>
      <path d="M7 11 V37 A17 6 0 0 0 41 37 V11" style={{ fill: ink(t), stroke: ink(t) }} />
      <path d="M7 20 A17 6 0 0 0 41 20 M7 28.5 A17 6 0 0 0 41 28.5" fill="none" style={{ stroke: PAPER }} strokeOpacity={0.75} />
      <ellipse cx={24} cy={11} rx={17} ry={6} style={{ fill: soft(t), stroke: ink(t) }} />
    </>
  ),
  cache: (t) => (
    <>
      {[33, 25, 17].map((y) => (
        <path
          key={y}
          d={`M24 ${y - 8} L44 ${y} L24 ${y + 8} L4 ${y} Z`}
          style={{ fill: ink(t), stroke: PAPER }}
          fillOpacity={y === 17 ? 1 : y === 25 ? 0.8 : 0.6}
        />
      ))}
    </>
  ),
  queue: (t) => (
    <>
      <path d="M9 13 H39 A5 11 0 0 1 39 35 H9 A5 11 0 0 1 9 13 Z" style={{ fill: soft(t), stroke: ink(t) }} />
      {[13, 21, 29].map((x) => (
        <path key={x} d={`M${x} 13.5 A4 10.5 0 0 0 ${x} 34.5 H${x + 6} A4 10.5 0 0 1 ${x + 6} 13.5 Z`} style={{ fill: ink(t) }} fillOpacity={0.45} />
      ))}
      <ellipse cx={39} cy={24} rx={5} ry={11} style={{ fill: PAPER, stroke: ink(t) }} />
    </>
  ),
  blob: (t) => (
    <>
      <path d="M7 13 L12 40 Q24 45 36 40 L41 13" style={{ fill: ink(t), stroke: ink(t) }} />
      <ellipse cx={24} cy={13} rx={17} ry={5.5} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M16 27 L21 22 L26 27 L29 24 L33 28" fill="none" style={{ stroke: PAPER }} strokeLinejoin="round" />
    </>
  ),
  cdn: (t) => (
    <>
      <circle cx={24} cy={24} r={17} style={{ fill: soft(t), stroke: ink(t) }} />
      <ellipse cx={24} cy={24} rx={7.5} ry={17} fill="none" style={{ stroke: ink(t) }} />
      <path d="M7 24 H41 M10 15 H38 M10 33 H38" fill="none" style={{ stroke: ink(t) }} />
    </>
  ),
  "load-balancer": (t) => (
    <>
      <circle cx={24} cy={24} r={18} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M12 24 H20 M20 24 L33 15 M20 24 H33 M20 24 L33 33" fill="none" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <path d="M31 12 L35 14.5 L32 18 M31 21 L35 24 L31 27 M32 30 L35 33.5 L31 36" fill="none" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={12} cy={24} r={2.6} style={{ fill: ink(t) }} />
    </>
  ),
  phone: (t) => (
    <>
      <rect x={13} y={4} width={22} height={40} rx={4.5} style={{ fill: PAPER, stroke: ink(t) }} />
      <rect x={16} y={9} width={16} height={27} rx={1.5} style={{ fill: soft(t) }} />
      <rect x={18.5} y={13} width={9} height={5} rx={2.5} style={{ fill: ink(t) }} fillOpacity={0.5} />
      <rect x={20.5} y={21} width={9} height={5} rx={2.5} style={{ fill: ink(t) }} />
      <circle cx={24} cy={40} r={1.6} style={{ fill: ink(t) }} />
    </>
  ),
  server: (t) => (
    <>
      {[7, 19, 31].map((y) => (
        <g key={y}>
          <rect x={7} y={y} width={34} height={10} rx={2.5} style={{ fill: soft(t), stroke: ink(t) }} />
          <path d={`M12 ${y + 5} H24`} style={{ stroke: ink(t) }} strokeLinecap="round" />
          <circle cx={35} cy={y + 5} r={1.8} style={{ fill: ink(t) }} />
        </g>
      ))}
    </>
  ),
  chat: (t) => (
    <>
      <path d="M5 9 H31 A3 3 0 0 1 34 12 V26 A3 3 0 0 1 31 29 H15 L9 34 V29 H8 A3 3 0 0 1 5 26 V12 A3 3 0 0 1 8 9 Z" style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M17 20 H40 A3 3 0 0 1 43 23 V35 A3 3 0 0 1 40 38 H39 V43 L33 38 H20 A3 3 0 0 1 17 35 Z" style={{ fill: ink(t), stroke: ink(t) }} />
      <path d="M23 29 H37" style={{ stroke: PAPER }} strokeLinecap="round" strokeDasharray="0.1 4.5" strokeWidth={2.6} />
    </>
  ),
  registry: (t) => (
    <>
      <rect x={6} y={7} width={36} height={34} rx={4} style={{ fill: PAPER, stroke: ink(t) }} />
      <rect x={6} y={7} width={36} height={8} rx={4} style={{ fill: ink(t) }} />
      {[21, 28, 35].map((y) => (
        <g key={y}>
          <circle cx={12} cy={y} r={2} style={{ fill: ink(t) }} />
          <path d={`M17 ${y} H26 M30 ${y} H37`} style={{ stroke: ink(t) }} strokeLinecap="round" strokeOpacity={0.7} />
        </g>
      ))}
    </>
  ),
  presence: (t) => (
    <>
      <circle cx={24} cy={24} r={18} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M8 25 H16 L19 17 L24 33 L28 21 L30 25 H40" fill="none" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={36} cy={12} r={4} style={{ fill: ink(t), stroke: PAPER }} />
    </>
  ),
  bell: (t) => (
    <>
      <path d="M12 33 V22 A12 12 0 0 1 36 22 V33 L39 36 H9 Z" style={{ fill: ink(t), stroke: ink(t) }} strokeLinejoin="round" />
      <path d="M20 39 A4 4 0 0 0 28 39" fill="none" style={{ stroke: ink(t) }} strokeWidth={2} />
      <circle cx={35} cy={12} r={5} style={{ fill: soft(t), stroke: ink(t) }} />
    </>
  ),
  workers: (t) => (
    <>
      <circle cx={18} cy={20} r={9} fill="none" style={{ stroke: ink(t) }} strokeWidth={5} strokeDasharray="3.6 3.47" />
      <circle cx={18} cy={20} r={6.5} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={18} cy={20} r={2.4} style={{ fill: ink(t) }} />
      <circle cx={32} cy={33} r={7} fill="none" style={{ stroke: ink(t) }} strokeWidth={4.5} strokeDasharray="3 2.5" />
      <circle cx={32} cy={33} r={5} style={{ fill: ink(t) }} />
      <circle cx={32} cy={33} r={1.8} style={{ fill: PAPER }} />
    </>
  ),
  users: (t) => (
    <>
      <circle cx={31} cy={16} r={6} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M21 39 A10 10 0 0 1 41 39 Z" style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={18} cy={18} r={7} style={{ fill: ink(t), stroke: PAPER }} />
      <path d="M6 42 A12 12 0 0 1 30 42 Z" style={{ fill: ink(t), stroke: PAPER }} />
    </>
  ),
  gateway: (t) => (
    <>
      <path d="M24 5 L40 11 V23 C40 33 33 40 24 43 C15 40 8 33 8 23 V11 Z" style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M17 24 L22 29 L32 18" fill="none" style={{ stroke: ink(t) }} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  media: (t) => (
    <>
      <rect x={5} y={9} width={38} height={30} rx={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M5 34 L17 22 L26 31 L31 26 L43 36" fill="none" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={33} cy={17} r={3.5} style={{ fill: ink(t) }} />
    </>
  ),
  bag: (t) => (
    <>
      <path d="M8 16 H40 L37 43 H11 Z" style={{ fill: ink(t), stroke: ink(t) }} strokeLinejoin="round" />
      <path d="M17 20 V13 A7 7 0 0 1 31 13 V20" fill="none" style={{ stroke: ink(t) }} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M16 29 H32 M18 35 H30" style={{ stroke: PAPER }} strokeLinecap="round" strokeOpacity={0.8} />
    </>
  ),
  card: (t) => (
    <>
      <rect x={4} y={11} width={40} height={27} rx={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={4} y={17} width={40} height={6} style={{ fill: ink(t) }} />
      <rect x={9} y={28} width={10} height={5} rx={1.5} style={{ fill: ink(t) }} fillOpacity={0.6} />
      <path d="M25 31 H38" style={{ stroke: ink(t) }} strokeLinecap="round" />
    </>
  ),
  history: (t) => (
    <>
      <circle cx={25} cy={24} r={16} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M25 15 V24 L31 28" fill="none" style={{ stroke: ink(t) }} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 24 A16 16 0 0 1 14 12.5" fill="none" style={{ stroke: ink(t) }} strokeWidth={2.2} />
      <path d="M5 21 L9 26 L13 21" fill="none" style={{ stroke: ink(t) }} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export function isGlyph(name: string | undefined): name is GlyphName {
  return !!name && name in GLYPHS;
}

/** Draws glyph `name` centred on (cx, cy), `size` units wide. */
export function Glyph({ name, tone, cx, cy, size }: { name: GlyphName; tone: Tone; cx: number; cy: number; size: number }) {
  const s = size / 48;
  return (
    <g transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${s})`} strokeWidth={1.5}>
      {GLYPHS[name](tone)}
    </g>
  );
}
