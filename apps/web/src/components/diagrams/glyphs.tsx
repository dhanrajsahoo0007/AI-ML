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
  | "card"
  | "dns"
  | "lock"
  | "key"
  | "shield"
  | "timer"
  | "clock"
  | "cpu"
  | "gpu"
  | "disk"
  | "file"
  | "folder"
  | "log"
  | "search"
  | "tree"
  | "map"
  | "chart"
  | "link"
  | "globe"
  | "robot"
  | "feed"
  | "video"
  | "ticket"
  | "ledger"
  | "browser"
  | "api"
  | "coordinator"
  | "trie"
  | "hash"
  | "ring"
  | "firewall"
  | "router"
  | "nat"
  | "tunnel"
  | "building"
  | "webhook"
  | "image"
  | "container"
  | "pod"
  | "node"
  | "function"
  | "controller"
  | "folder-share"
  | "appliance"
  | "proxy"
  | "partition"
  | "topic"
  | "snapshot"
  | "vault"
  | "certificate"
  | "radar"
  | "signal"
  | "trace"
  | "flag"
  | "meter"
  | "coin"
  | "model"
  | "policy"
  | "pipeline";

const ink = (t: Tone) => `var(--dg-${t})`;
const soft = (t: Tone) => `var(--dg-${t}-soft)`;
const PAPER = "var(--paper)";

const GLYPHS: Record<GlyphName, (t: Tone) => ReactNode> = {
  database: (t) => (
    <>
      <path d="M7 11 V37 A17 6 0 0 0 41 37 V11" style={{ fill: ink(t), stroke: ink(t) }} />
      <path
        d="M7 20 A17 6 0 0 0 41 20 M7 28.5 A17 6 0 0 0 41 28.5"
        fill="none"
        style={{ stroke: PAPER }}
        strokeOpacity={0.75}
      />
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
        <path
          key={x}
          d={`M${x} 13.5 A4 10.5 0 0 0 ${x} 34.5 H${x + 6} A4 10.5 0 0 1 ${x + 6} 13.5 Z`}
          style={{ fill: ink(t) }}
          fillOpacity={0.45}
        />
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
      <path
        d="M12 24 H20 M20 24 L33 15 M20 24 H33 M20 24 L33 33"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M31 12 L35 14.5 L32 18 M31 21 L35 24 L31 27 M32 30 L35 33.5 L31 36"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <path
        d="M5 9 H31 A3 3 0 0 1 34 12 V26 A3 3 0 0 1 31 29 H15 L9 34 V29 H8 A3 3 0 0 1 5 26 V12 A3 3 0 0 1 8 9 Z"
        style={{ fill: soft(t), stroke: ink(t) }}
      />
      <path
        d="M17 20 H40 A3 3 0 0 1 43 23 V35 A3 3 0 0 1 40 38 H39 V43 L33 38 H20 A3 3 0 0 1 17 35 Z"
        style={{ fill: ink(t), stroke: ink(t) }}
      />
      <path
        d="M23 29 H37"
        style={{ stroke: PAPER }}
        strokeLinecap="round"
        strokeDasharray="0.1 4.5"
        strokeWidth={2.6}
      />
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
      <path
        d="M8 25 H16 L19 17 L24 33 L28 21 L30 25 H40"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={36} cy={12} r={4} style={{ fill: ink(t), stroke: PAPER }} />
    </>
  ),
  bell: (t) => (
    <>
      <path
        d="M12 33 V22 A12 12 0 0 1 36 22 V33 L39 36 H9 Z"
        style={{ fill: ink(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
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
      <path
        d="M17 24 L22 29 L32 18"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  media: (t) => (
    <>
      <rect x={5} y={9} width={38} height={30} rx={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <path
        d="M5 34 L17 22 L26 31 L31 26 L43 36"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx={33} cy={17} r={3.5} style={{ fill: ink(t) }} />
    </>
  ),
  bag: (t) => (
    <>
      <path d="M8 16 H40 L37 43 H11 Z" style={{ fill: ink(t), stroke: ink(t) }} strokeLinejoin="round" />
      <path
        d="M17 20 V13 A7 7 0 0 1 31 13 V20"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
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
      <path
        d="M25 15 V24 L31 28"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 24 A16 16 0 0 1 14 12.5" fill="none" style={{ stroke: ink(t) }} strokeWidth={2.2} />
      <path
        d="M5 21 L9 26 L13 21"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  // Second batch: stroke-only line art, 1.5 stroke, round caps. Each one reads at 54px.
  dns: (t) => (
    <>
      <path d="M24 6 V43" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <path d="M24 11 H37 L42 16 L37 21 H24 Z" style={{ fill: soft(t), stroke: ink(t) }} strokeLinejoin="round" />
      <path d="M24 25 H11 L6 30 L11 35 H24 Z" style={{ fill: ink(t), stroke: ink(t) }} strokeLinejoin="round" />
      <path d="M28 16 H36" style={{ stroke: ink(t) }} strokeLinecap="round" strokeOpacity={0.7} />
      <path d="M12 30 H20" style={{ stroke: PAPER }} strokeLinecap="round" />
    </>
  ),
  lock: (t) => (
    <>
      <path d="M15 21 V15 A9 9 0 0 1 33 15 V21" fill="none" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <rect x={9} y={21} width={30} height={22} rx={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={24} cy={30} r={3} style={{ fill: ink(t) }} />
      <path d="M24 32 V37" style={{ stroke: ink(t) }} strokeWidth={2.5} strokeLinecap="round" />
    </>
  ),
  key: (t) => (
    <>
      <circle cx={15} cy={30} r={9} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={15} cy={30} r={3} style={{ fill: PAPER, stroke: ink(t) }} />
      <path
        d="M22 23 L40 5 M34 11 L38 15 M29 16 L33 20"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </>
  ),
  shield: (t) => (
    <>
      <path d="M24 5 L40 11 V23 C40 33 33 40 24 43 C15 40 8 33 8 23 V11 Z" style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M24 5 L40 11 V23 C40 33 33 40 24 43 Z" style={{ fill: ink(t) }} fillOpacity={0.85} />
      <path d="M24 12 V36" style={{ stroke: PAPER }} strokeLinecap="round" strokeOpacity={0.7} />
    </>
  ),
  timer: (t) => (
    <>
      <path d="M20 5 H28 M24 5 V10" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <path d="M36 12 L39 9" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <circle cx={24} cy={27} r={16} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M24 27 L24 16 A11 11 0 0 1 35 27 Z" style={{ fill: ink(t) }} fillOpacity={0.6} />
      <path d="M24 27 L32 22" style={{ stroke: ink(t) }} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={24} cy={27} r={1.8} style={{ fill: ink(t) }} />
    </>
  ),
  clock: (t) => (
    <>
      <circle cx={24} cy={24} r={18} style={{ fill: soft(t), stroke: ink(t) }} />
      <path
        d="M24 8 V11 M40 24 H37 M24 40 V37 M8 24 H11"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M24 24 V13 M24 24 L32 29"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <circle cx={24} cy={24} r={1.8} style={{ fill: ink(t) }} />
    </>
  ),
  cpu: (t) => (
    <>
      <path
        d="M16 5 V10 M24 5 V10 M32 5 V10 M16 38 V43 M24 38 V43 M32 38 V43 M5 16 H10 M5 24 H10 M5 32 H10 M38 16 H43 M38 24 H43 M38 32 H43"
        style={{ stroke: ink(t) }}
        strokeLinecap="round"
      />
      <rect x={10} y={10} width={28} height={28} rx={3} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={17} y={17} width={14} height={14} rx={1.5} style={{ fill: ink(t), stroke: ink(t) }} />
    </>
  ),
  gpu: (t) => (
    <>
      <rect x={4} y={10} width={40} height={24} rx={3} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M10 34 V39 H34 V34" fill="none" style={{ stroke: ink(t) }} strokeLinejoin="round" />
      <path d="M14 36 V39 M18 36 V39 M22 36 V39 M26 36 V39 M30 36 V39" style={{ stroke: ink(t) }} strokeOpacity={0.7} />
      <circle cx={17} cy={22} r={7} style={{ fill: PAPER, stroke: ink(t) }} />
      <path d="M17 22 L17 16 M17 22 L22 25 M17 22 L12 25" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <circle cx={17} cy={22} r={1.5} style={{ fill: ink(t) }} />
      <circle cx={33} cy={22} r={7} style={{ fill: PAPER, stroke: ink(t) }} />
      <path d="M33 22 L33 16 M33 22 L38 25 M33 22 L28 25" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <circle cx={33} cy={22} r={1.5} style={{ fill: ink(t) }} />
    </>
  ),
  disk: (t) => (
    <>
      <rect x={7} y={6} width={34} height={36} rx={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={22} cy={22} r={11} style={{ fill: ink(t), stroke: ink(t) }} />
      <circle cx={22} cy={22} r={6.5} fill="none" style={{ stroke: PAPER }} strokeOpacity={0.6} />
      <circle cx={22} cy={22} r={2} style={{ fill: PAPER }} />
      <path d="M36 12 L28 25" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <circle cx={36} cy={12} r={2.2} style={{ fill: PAPER, stroke: ink(t) }} />
      <path d="M13 37 H21" style={{ stroke: ink(t) }} strokeLinecap="round" strokeOpacity={0.7} />
      <circle cx={34} cy={37} r={1.6} style={{ fill: ink(t) }} />
    </>
  ),
  file: (t) => (
    <>
      <path
        d="M11 5 H29 L39 15 V40 A3 3 0 0 1 36 43 H11 A3 3 0 0 1 8 40 V8 A3 3 0 0 1 11 5 Z"
        style={{ fill: soft(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path d="M29 5 V15 H39" fill="none" style={{ stroke: ink(t) }} strokeLinejoin="round" />
      <path d="M15 24 H32 M15 30 H32 M15 36 H26" style={{ stroke: ink(t) }} strokeLinecap="round" strokeOpacity={0.7} />
    </>
  ),
  folder: (t) => (
    <>
      <path
        d="M5 11 A3 3 0 0 1 8 8 H18 L22 13 H40 A3 3 0 0 1 43 16 V38 A3 3 0 0 1 40 41 H8 A3 3 0 0 1 5 38 Z"
        style={{ fill: ink(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path
        d="M5 20 H43 V38 A3 3 0 0 1 40 41 H8 A3 3 0 0 1 5 38 Z"
        style={{ fill: soft(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
    </>
  ),
  log: (t) => (
    <>
      <rect x={8} y={5} width={32} height={38} rx={3} style={{ fill: soft(t), stroke: ink(t) }} />
      {[12, 19, 26, 33].map((y) => (
        <g key={y}>
          <circle cx={14} cy={y} r={1.6} style={{ fill: ink(t) }} />
          <path
            d={`M19 ${y} H${y === 33 ? 25 : 34}`}
            style={{ stroke: ink(t) }}
            strokeLinecap="round"
            strokeOpacity={0.7}
          />
        </g>
      ))}
      <path
        d="M19 39 H28 M26 36.5 L28.5 39 L26 41.5"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  search: (t) => (
    <>
      <circle cx={20} cy={20} r={13} style={{ fill: soft(t), stroke: ink(t) }} />
      <path
        d="M13 19 A7 7 0 0 1 19 13"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeLinecap="round"
        strokeOpacity={0.7}
      />
      <path d="M30 30 L41 41" style={{ stroke: ink(t) }} strokeWidth={4} strokeLinecap="round" />
    </>
  ),
  tree: (t) => (
    <>
      <path
        d="M24 12 V19 M12 19 H36 M12 19 V26 M36 19 V26 M12 33 V38 M36 33 V38"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeLinecap="round"
      />
      <rect x={16} y={5} width={16} height={8} rx={2} style={{ fill: ink(t), stroke: ink(t) }} />
      <rect x={4} y={26} width={16} height={8} rx={2} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={28} y={26} width={16} height={8} rx={2} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={4} y={37} width={16} height={7} rx={2} style={{ fill: PAPER, stroke: ink(t) }} />
      <rect x={28} y={37} width={16} height={7} rx={2} style={{ fill: PAPER, stroke: ink(t) }} />
    </>
  ),
  map: (t) => (
    <>
      <path
        d="M5 12 L17 7 L31 13 L43 8 V36 L31 41 L17 35 L5 40 Z"
        style={{ fill: soft(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path d="M17 7 V35 M31 13 V41" style={{ stroke: ink(t) }} strokeOpacity={0.6} />
      <path
        d="M10 28 Q16 20 22 25 T38 20"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeLinecap="round"
        strokeDasharray="2.5 2.5"
      />
      <path
        d="M31 10 A5.5 5.5 0 0 1 36.5 15.5 C36.5 19.5 31 26 31 26 C31 26 25.5 19.5 25.5 15.5 A5.5 5.5 0 0 1 31 10 Z"
        style={{ fill: ink(t), stroke: PAPER }}
      />
      <circle cx={31} cy={15.5} r={1.8} style={{ fill: PAPER }} />
    </>
  ),
  chart: (t) => (
    <>
      <path d="M7 6 V41 H42" fill="none" style={{ stroke: ink(t) }} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={12} y={27} width={6} height={14} rx={1} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={21} y={18} width={6} height={23} rx={1} style={{ fill: ink(t), stroke: ink(t) }} fillOpacity={0.7} />
      <rect x={30} y={10} width={6} height={31} rx={1} style={{ fill: ink(t), stroke: ink(t) }} />
      <path
        d="M15 22 L24 13 L33 6"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2.5 2.5"
      />
    </>
  ),
  link: (t) => (
    <>
      <path
        d="M20 30 L14 36 A7 7 0 0 1 4 26 L12 18 A7 7 0 0 1 22 18"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 18 L34 12 A7 7 0 0 1 44 22 L36 30 A7 7 0 0 1 26 30"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 29 L29 19" style={{ stroke: ink(t) }} strokeWidth={2.4} strokeLinecap="round" strokeOpacity={0.6} />
    </>
  ),
  globe: (t) => (
    <>
      <path d="M16 43 H32 M24 38 V43" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <path d="M10 10 L38 38" style={{ stroke: ink(t) }} strokeLinecap="round" strokeOpacity={0.6} />
      <circle cx={24} cy={22} r={15} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M9.5 20 Q24 26 38.5 20" fill="none" style={{ stroke: ink(t) }} />
      <path d="M16 11 Q22 20 15 32 M30 10 Q36 20 29 33" fill="none" style={{ stroke: ink(t) }} strokeOpacity={0.6} />
      <path d="M17 17 Q21 14 24 17 Q27 20 24 23 Q20 22 17 17 Z" style={{ fill: ink(t) }} fillOpacity={0.8} />
      <path d="M28 24 Q33 23 33 28 Q30 31 27 28 Z" style={{ fill: ink(t) }} fillOpacity={0.8} />
    </>
  ),
  robot: (t) => (
    <>
      <path d="M24 5 V11" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <circle cx={24} cy={5} r={2} style={{ fill: ink(t) }} />
      <rect x={9} y={11} width={30} height={26} rx={5} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M9 20 H4 V28 H9 M39 20 H44 V28 H39" fill="none" style={{ stroke: ink(t) }} strokeLinejoin="round" />
      <circle cx={18} cy={22} r={3} style={{ fill: ink(t) }} />
      <circle cx={30} cy={22} r={3} style={{ fill: ink(t) }} />
      <path d="M17 30 H31" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <path d="M17 37 V42 M31 37 V42" style={{ stroke: ink(t) }} strokeLinecap="round" />
    </>
  ),
  feed: (t) => (
    <>
      <rect x={5} y={5} width={38} height={38} rx={6} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={14} cy={34} r={3.2} style={{ fill: ink(t) }} />
      <path
        d="M12 23 A13 13 0 0 1 25 36"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <path
        d="M12 14 A22 22 0 0 1 34 36"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </>
  ),
  video: (t) => (
    <>
      <rect x={4} y={9} width={40} height={30} rx={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M4 15 H44 M4 33 H44" style={{ stroke: ink(t) }} strokeOpacity={0.7} />
      <path
        d="M10 9 V15 M17 9 V15 M24 9 V15 M31 9 V15 M38 9 V15 M10 33 V39 M17 33 V39 M24 33 V39 M31 33 V39 M38 33 V39"
        style={{ stroke: ink(t) }}
        strokeOpacity={0.5}
      />
      <path d="M20 19 L30 24 L20 29 Z" style={{ fill: ink(t), stroke: ink(t) }} strokeLinejoin="round" />
    </>
  ),
  ticket: (t) => (
    <>
      <path
        d="M4 14 A3 3 0 0 1 7 11 H41 A3 3 0 0 1 44 14 V19 A5 5 0 0 0 44 29 V34 A3 3 0 0 1 41 37 H7 A3 3 0 0 1 4 34 V29 A5 5 0 0 0 4 19 Z"
        style={{ fill: soft(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path d="M31 12 V36" style={{ stroke: ink(t) }} strokeLinecap="round" strokeDasharray="2.5 2.5" />
      <path d="M11 20 H25 M11 26 H21" style={{ stroke: ink(t) }} strokeLinecap="round" strokeOpacity={0.7} />
      <circle cx={37.5} cy={24} r={2.4} style={{ fill: ink(t) }} />
    </>
  ),
  ledger: (t) => (
    <>
      <path
        d="M11 5 H38 A3 3 0 0 1 41 8 V40 A3 3 0 0 1 38 43 H11 Z"
        style={{ fill: soft(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path
        d="M7 8 H11 V43 H7 A2 2 0 0 1 5 41 V10 A2 2 0 0 1 7 8 Z"
        style={{ fill: ink(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path d="M16 14 H36 M16 21 H36 M16 28 H36 M16 35 H36" style={{ stroke: ink(t) }} strokeOpacity={0.6} />
      <path d="M29 10 V38" style={{ stroke: ink(t) }} strokeOpacity={0.6} />
      <path
        d="M32 14 H35 M32 21 H35 M31 28 H35 M31 35 H35"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </>
  ),
  browser: (t) => (
    <>
      <rect x={4} y={7} width={40} height={34} rx={4} style={{ fill: PAPER, stroke: ink(t) }} />
      <path d="M4 16 H44" style={{ stroke: ink(t) }} />
      <circle cx={10} cy={11.5} r={1.5} style={{ fill: ink(t) }} />
      <circle cx={15} cy={11.5} r={1.5} style={{ fill: ink(t) }} />
      <rect x={20} y={9.5} width={20} height={4} rx={2} style={{ fill: soft(t), stroke: ink(t) }} strokeOpacity={0.7} />
      <rect x={9} y={21} width={30} height={15} rx={2} style={{ fill: soft(t) }} />
      <path d="M13 26 H29 M13 31 H23" style={{ stroke: ink(t) }} strokeLinecap="round" strokeOpacity={0.7} />
    </>
  ),
  api: (t) => (
    <>
      <rect x={4} y={9} width={40} height={30} rx={5} style={{ fill: soft(t), stroke: ink(t) }} />
      <path
        d="M17 15 C13 15 14 20 14 22 C14 24 11 24 11 24 C11 24 14 24 14 26 C14 28 13 33 17 33"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 15 C35 15 34 20 34 22 C34 24 37 24 37 24 C37 24 34 24 34 26 C34 28 35 33 31 33"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={24} cy={24} r={2.2} style={{ fill: ink(t) }} />
    </>
  ),
  coordinator: (t) => (
    <>
      <path d="M24 24 L24 9 M24 24 L10 34 M24 24 L38 34" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <circle cx={24} cy={9} r={5} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={10} cy={34} r={5} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={38} cy={34} r={5} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={24} cy={24} r={7} style={{ fill: ink(t), stroke: ink(t) }} />
      <path
        d="M21 24 L23 26 L27.5 21.5"
        fill="none"
        style={{ stroke: PAPER }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  trie: (t) => (
    <>
      <path
        d="M24 8 L13 18 M24 8 L35 18 M13 18 V29 M35 18 L30 29 M35 18 L40 29 M13 29 V40"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeLinecap="round"
      />
      <circle cx={24} cy={8} r={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={13} cy={18} r={3.5} style={{ fill: PAPER, stroke: ink(t) }} />
      <circle cx={35} cy={18} r={3.5} style={{ fill: PAPER, stroke: ink(t) }} />
      <circle cx={13} cy={29} r={3.5} style={{ fill: PAPER, stroke: ink(t) }} />
      <circle cx={30} cy={29} r={3.5} style={{ fill: ink(t), stroke: ink(t) }} />
      <circle cx={40} cy={29} r={3.5} style={{ fill: ink(t), stroke: ink(t) }} />
      <circle cx={13} cy={40} r={3.5} style={{ fill: ink(t), stroke: ink(t) }} />
    </>
  ),
  hash: (t) => (
    <>
      <rect x={5} y={5} width={38} height={38} rx={7} style={{ fill: soft(t), stroke: ink(t) }} />
      <path
        d="M19 13 L16 35 M32 13 L29 35 M13 20 H36 M12 28 H35"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </>
  ),
  ring: (t) => (
    <>
      <circle cx={24} cy={24} r={17} fill="none" style={{ stroke: ink(t) }} strokeWidth={2} />
      <path
        d="M24 13 A11 11 0 0 1 35 24"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeLinecap="round"
        strokeDasharray="2.5 2.5"
        strokeOpacity={0.7}
      />
      <path
        d="M33 21 L35 24.5 L38 22"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.7}
      />
      <circle cx={24} cy={7} r={4} style={{ fill: ink(t), stroke: PAPER }} />
      <circle cx={40.2} cy={18.8} r={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={34} cy={37.8} r={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={14} cy={37.8} r={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={7.8} cy={18.8} r={4} style={{ fill: soft(t), stroke: ink(t) }} />
    </>
  ),
  // Third batch, for the cloud curriculum: networking, containers, security and operations. Same rules: soft
  // fill with a tone stroke, a filled part for the thing the glyph is about, no letters, nothing vendor-shaped.
  firewall: (t) => (
    <>
      <rect x={5} y={19} width={38} height={24} rx={2} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M5 27 H43 M5 35 H43" style={{ stroke: ink(t) }} />
      <path
        d="M14 19 V27 M34 19 V27 M19 27 V35 M29 27 V35 M14 35 V43 M24 35 V43 M34 35 V43"
        style={{ stroke: ink(t) }}
        strokeOpacity={0.7}
      />
      <path
        d="M25 4 C25 8.5 32 10.5 32 16 A8 8 0 0 1 16 16 C16 13 17.5 11 19 9.5 C19.5 12 21 13 22 13 C21 9.5 23 6 25 4 Z"
        style={{ fill: ink(t), stroke: PAPER }}
        strokeLinejoin="round"
      />
      <path
        d="M24 15 C25.5 17 26.5 18 26.5 19.3 A2.5 2.5 0 0 1 21.5 19.3 C21.5 18 22.5 17 24 15 Z"
        style={{ fill: soft(t) }}
      />
    </>
  ),
  router: (t) => (
    <>
      <path
        d="M24 15 V6 M33 24 H42 M24 33 V42 M15 24 H6"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M20.5 9.5 L24 6 L27.5 9.5 M38.5 20.5 L42 24 L38.5 27.5 M27.5 38.5 L24 42 L20.5 38.5 M9.5 27.5 L6 24 L9.5 20.5"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={15} y={15} width={18} height={18} rx={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={24} cy={24} r={3} style={{ fill: ink(t) }} />
    </>
  ),
  nat: (t) => (
    <>
      <path d="M7 14 H17 M7 24 H17 M7 34 H17" style={{ stroke: ink(t) }} strokeLinecap="round" />
      {[14, 24, 34].map((y) => (
        <circle key={y} cx={6.5} cy={y} r={2.4} style={{ fill: ink(t) }} />
      ))}
      <rect x={17} y={9} width={14} height={30} rx={3} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M17 14 L31 24 M17 24 H31 M17 34 L31 24" style={{ stroke: ink(t) }} strokeOpacity={0.7} />
      <path d="M31 24 H42" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <path
        d="M38.5 20.5 L42 24 L38.5 27.5"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  tunnel: (t) => (
    <>
      <path d="M7 24 H12" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <path d="M14 14 H34 A3 10 0 0 1 34 34 H14 A3 10 0 0 1 14 14 Z" style={{ fill: soft(t), stroke: ink(t) }} />
      <ellipse cx={34} cy={24} rx={3} ry={10} style={{ fill: PAPER, stroke: ink(t) }} />
      <path d="M14 24 H30" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" strokeDasharray="3 3.5" />
      <path d="M34 24 H41" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <circle cx={7} cy={24} r={3} style={{ fill: ink(t) }} />
      <circle cx={41} cy={24} r={3} style={{ fill: ink(t) }} />
    </>
  ),
  building: (t) => (
    <>
      <path
        d="M11 6 H28 A2 2 0 0 1 30 8 V43 H9 V8 A2 2 0 0 1 11 6 Z"
        style={{ fill: soft(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path d="M30 20 H38 A2 2 0 0 1 40 22 V43 H30 Z" style={{ fill: PAPER, stroke: ink(t) }} strokeLinejoin="round" />
      {[11, 19, 27].map((y) => (
        <g key={y}>
          <rect x={13} y={y} width={4.5} height={4.5} rx={0.8} style={{ fill: ink(t) }} />
          <rect x={21.5} y={y} width={4.5} height={4.5} rx={0.8} style={{ fill: ink(t) }} />
        </g>
      ))}
      <rect x={16.5} y={35} width={6} height={8} style={{ fill: ink(t) }} />
      <rect x={33} y={25} width={4} height={4} rx={0.8} style={{ fill: ink(t) }} fillOpacity={0.6} />
      <rect x={33} y={33} width={4} height={4} rx={0.8} style={{ fill: ink(t) }} fillOpacity={0.6} />
      <path d="M4 43 H44" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  webhook: (t) => (
    <>
      <path
        d="M11 12 H29 A12 12 0 0 1 29 36 H18"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path
        d="M22.5 31.5 L18 36 L22.5 40.5"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={8} cy={12} r={3.5} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={10} cy={36} r={4} style={{ fill: ink(t) }} />
    </>
  ),
  image: (t) => (
    <>
      {[30, 22, 14].map((y) => (
        <path
          key={y}
          d={`M21 ${y - 7} L38 ${y} L21 ${y + 7} L4 ${y} Z`}
          style={{ fill: soft(t), stroke: ink(t) }}
          strokeLinejoin="round"
        />
      ))}
      <path
        d="M28 36 L33.5 30 H42 A2 2 0 0 1 44 32 V40 A2 2 0 0 1 42 42 H33.5 Z"
        style={{ fill: ink(t), stroke: PAPER }}
        strokeLinejoin="round"
      />
      <circle cx={34.5} cy={36} r={1.7} style={{ fill: PAPER }} />
    </>
  ),
  container: (t) => (
    <>
      <rect x={5} y={10} width={38} height={25} rx={2} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={5} y={10} width={38} height={5} rx={2} style={{ fill: ink(t) }} />
      <rect x={5} y={30} width={38} height={5} rx={2} style={{ fill: ink(t) }} />
      <path
        d="M11 19 V26 M17.5 19 V26 M24 19 V26 M30.5 19 V26 M37 19 V26"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <rect x={8} y={35} width={5} height={3} style={{ fill: ink(t) }} />
      <rect x={35} y={35} width={5} height={3} style={{ fill: ink(t) }} />
    </>
  ),
  pod: (t) => (
    <>
      <rect x={4} y={11} width={40} height={26} rx={13} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={11} y={18} width={11} height={12} rx={2} style={{ fill: ink(t), stroke: ink(t) }} />
      <rect x={26} y={18} width={11} height={12} rx={2} style={{ fill: PAPER, stroke: ink(t) }} />
    </>
  ),
  node: (t) => (
    <>
      <rect x={5} y={6} width={38} height={36} rx={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M5 33 H43" style={{ stroke: ink(t) }} />
      <circle cx={11} cy={37.5} r={1.7} style={{ fill: ink(t) }} />
      <path d="M30 37.5 H38" style={{ stroke: ink(t) }} strokeLinecap="round" strokeOpacity={0.7} />
      <rect x={10.5} y={11} width={7} height={17} rx={3.5} style={{ fill: ink(t), stroke: ink(t) }} />
      <rect x={20.5} y={11} width={7} height={17} rx={3.5} style={{ fill: ink(t), stroke: ink(t) }} />
      <rect x={30.5} y={11} width={7} height={17} rx={3.5} style={{ fill: PAPER, stroke: ink(t) }} />
    </>
  ),
  function: (t) => (
    <>
      <rect x={5} y={5} width={38} height={38} rx={7} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M27 10 L15 26 H23 L21 38 L33 22 H25 Z" style={{ fill: ink(t), stroke: ink(t) }} strokeLinejoin="round" />
    </>
  ),
  controller: (t) => (
    <>
      <path
        d="M9.2 21.4 A15 15 0 0 1 38.1 18.9 M38.8 26.6 A15 15 0 0 1 9.9 29.1"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <path
        d="M39.4 13.6 L38.1 18.9 L33.2 16.4 M8.6 34.4 L9.9 29.1 L14.8 31.6"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={24} cy={24} r={7} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={24} cy={24} r={2.6} style={{ fill: ink(t) }} />
    </>
  ),
  "folder-share": (t) => (
    <>
      <path
        d="M7 9 A3 3 0 0 1 10 6 H18 L21.5 10.5 H38 A3 3 0 0 1 41 13.5 V26 A3 3 0 0 1 38 29 H10 A3 3 0 0 1 7 26 Z"
        style={{ fill: ink(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path
        d="M7 16 H41 V26 A3 3 0 0 1 38 29 H10 A3 3 0 0 1 7 26 Z"
        style={{ fill: soft(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path d="M24 29 V39 M7 39 H41" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <circle cx={24} cy={39} r={4} style={{ fill: ink(t), stroke: PAPER }} />
      <circle cx={7} cy={39} r={2.4} style={{ fill: ink(t) }} />
      <circle cx={41} cy={39} r={2.4} style={{ fill: ink(t) }} />
    </>
  ),
  appliance: (t) => (
    <>
      <path
        d="M16 15 V10.5 A2.5 2.5 0 0 1 18.5 8 H29.5 A2.5 2.5 0 0 1 32 10.5 V15"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <rect x={4} y={15} width={40} height={27} rx={3} style={{ fill: soft(t), stroke: ink(t) }} />
      <path
        d="M4 22 V18 A3 3 0 0 1 7 15 H11 Z M44 22 V18 A3 3 0 0 0 41 15 H37 Z M4 35 V39 A3 3 0 0 0 7 42 H11 Z M44 35 V39 A3 3 0 0 1 41 42 H37 Z"
        style={{ fill: ink(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path d="M4 27 H44" style={{ stroke: ink(t) }} />
      <rect x={12} y={24.5} width={5} height={5} rx={1} style={{ fill: ink(t) }} />
      <rect x={31} y={24.5} width={5} height={5} rx={1} style={{ fill: ink(t) }} />
      <path d="M17 35.5 H25" style={{ stroke: ink(t) }} strokeLinecap="round" strokeOpacity={0.7} />
      <circle cx={30} cy={35.5} r={1.7} style={{ fill: ink(t) }} />
    </>
  ),
  proxy: (t) => (
    <>
      <path d="M4 24 H12 M36 24 H43" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <path
        d="M9 20.5 L12.5 24 L9 27.5 M40 20.5 L43.5 24 L40 27.5"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={16} y={11} width={16} height={26} rx={3} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={20.5} y={17} width={7} height={14} rx={2} style={{ fill: ink(t) }} />
    </>
  ),
  partition: (t) => (
    <>
      <rect x={4} y={12} width={40} height={24} rx={3} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={17.5} y={12} width={13} height={24} style={{ fill: ink(t) }} fillOpacity={0.85} />
      <path d="M8 20 H13.5 M8 28 H13.5 M34.5 20 H40 M34.5 28 H40" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <path d="M21.5 20 H26.5 M21.5 28 H26.5" style={{ stroke: PAPER }} strokeLinecap="round" />
      <path d="M17.5 6 V42 M30.5 6 V42" style={{ stroke: ink(t) }} strokeLinecap="round" strokeDasharray="2.5 2.5" />
    </>
  ),
  topic: (t) => (
    <>
      <path d="M7 24 H18" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <circle cx={6.5} cy={24} r={2.6} style={{ fill: ink(t) }} />
      <path d="M25 12 H42 M25 24 H42 M25 36 H42" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <path
        d="M39 8.5 L42.5 12 L39 15.5 M39 20.5 L42.5 24 L39 27.5 M39 32.5 L42.5 36 L39 39.5"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={18} y={6} width={7} height={36} rx={3.5} style={{ fill: ink(t), stroke: ink(t) }} />
    </>
  ),
  snapshot: (t) => (
    <>
      <path
        d="M5 14 V9 A4 4 0 0 1 9 5 H14 M34 5 H39 A4 4 0 0 1 43 9 V14 M43 34 V39 A4 4 0 0 1 39 43 H34 M14 43 H9 A4 4 0 0 1 5 39 V34"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <circle cx={24} cy={24} r={12.5} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={24} cy={24} r={8} style={{ fill: ink(t) }} />
      <circle cx={24} cy={24} r={2.4} style={{ fill: PAPER }} />
    </>
  ),
  vault: (t) => (
    <>
      <path d="M12 40 V43.5 M36 40 V43.5" style={{ stroke: ink(t) }} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={5} y={5} width={38} height={35} rx={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={10} y={10} width={28} height={25} rx={2} style={{ fill: PAPER, stroke: ink(t) }} />
      <rect x={8.5} y={13} width={3} height={5} rx={1} style={{ fill: ink(t) }} />
      <rect x={8.5} y={27} width={3} height={5} rx={1} style={{ fill: ink(t) }} />
      <circle cx={22} cy={22.5} r={7.5} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M22 15 V30 M14.5 22.5 H29.5" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <circle cx={22} cy={22.5} r={2.8} style={{ fill: ink(t) }} />
      <path d="M34 17 V28" style={{ stroke: ink(t) }} strokeWidth={2.2} strokeLinecap="round" />
    </>
  ),
  certificate: (t) => (
    <>
      <rect x={5} y={6} width={38} height={28} rx={3} style={{ fill: soft(t), stroke: ink(t) }} />
      <path d="M11 14 H31 M11 20 H22 M11 26 H19" style={{ stroke: ink(t) }} strokeLinecap="round" strokeOpacity={0.7} />
      <path
        d="M28.5 32 L27 44 L33 40.5 L39 44 L37.5 32 Z"
        style={{ fill: ink(t), stroke: PAPER }}
        strokeLinejoin="round"
      />
      <circle cx={33} cy={27} r={7.5} style={{ fill: ink(t), stroke: PAPER }} />
      <circle cx={33} cy={27} r={3.6} fill="none" style={{ stroke: PAPER }} strokeOpacity={0.8} />
    </>
  ),
  radar: (t) => (
    <>
      <circle cx={24} cy={24} r={18} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={24} cy={24} r={11.5} fill="none" style={{ stroke: ink(t) }} strokeOpacity={0.6} />
      <circle cx={24} cy={24} r={5.5} fill="none" style={{ stroke: ink(t) }} strokeOpacity={0.6} />
      <path d="M24 24 L24 6 A18 18 0 0 1 39.6 15 Z" style={{ fill: ink(t) }} fillOpacity={0.45} />
      <path d="M24 24 L39.6 15" style={{ stroke: ink(t) }} strokeWidth={2} strokeLinecap="round" />
      <circle cx={24} cy={24} r={1.8} style={{ fill: ink(t) }} />
      <circle cx={14.5} cy={30.5} r={3} style={{ fill: ink(t), stroke: PAPER }} />
    </>
  ),
  signal: (t) => (
    <>
      <path d="M5 33 L13 25 L20 30 L29 16 L34 21 L40 11 V41 H5 Z" style={{ fill: soft(t) }} />
      <path d="M5 41 H43" style={{ stroke: ink(t) }} strokeLinecap="round" />
      <path
        d="M5 33 L13 25 L20 30 L29 16 L34 21 L40 11"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={40} cy={11} r={4} style={{ fill: ink(t), stroke: PAPER }} />
    </>
  ),
  trace: (t) => (
    <>
      <path d="M9 15 V24 H13 M18 27.5 V36.5 H24" fill="none" style={{ stroke: ink(t) }} strokeLinejoin="round" />
      <rect x={5} y={8} width={24} height={7} rx={3.5} style={{ fill: ink(t), stroke: ink(t) }} />
      <rect x={13} y={20.5} width={20} height={7} rx={3.5} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={24} y={33} width={19} height={7} rx={3.5} style={{ fill: soft(t), stroke: ink(t) }} />
    </>
  ),
  flag: (t) => (
    <>
      <path d="M12 6 V43 M6 43 H18" style={{ stroke: ink(t) }} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M12 9 H40 L34 17.5 L40 26 H12 Z" style={{ fill: ink(t), stroke: ink(t) }} strokeLinejoin="round" />
    </>
  ),
  meter: (t) => (
    <>
      <path d="M5 29 A19 19 0 0 1 43 29 Z" style={{ fill: soft(t), stroke: ink(t) }} strokeLinejoin="round" />
      <path
        d="M9 29 H12 M12.7 17.7 L14.8 19.8 M24 13 V16 M35.3 17.7 L33.2 19.8 M39 29 H36"
        style={{ stroke: ink(t) }}
        strokeLinecap="round"
        strokeOpacity={0.7}
      />
      <path d="M24 29 L31.5 18.3" style={{ stroke: ink(t) }} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={24} cy={29} r={3.2} style={{ fill: ink(t), stroke: PAPER }} />
      <rect x={15} y={34} width={18} height={6} rx={3} style={{ fill: ink(t) }} fillOpacity={0.6} />
    </>
  ),
  coin: (t) => (
    <>
      <circle cx={26.5} cy={26.5} r={16} style={{ fill: ink(t), stroke: ink(t) }} />
      <circle cx={21.5} cy={21.5} r={16} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={21.5} cy={21.5} r={11} fill="none" style={{ stroke: ink(t) }} strokeOpacity={0.6} />
      <path d="M21.5 15.5 L26.5 21.5 L21.5 27.5 L16.5 21.5 Z" style={{ fill: ink(t) }} />
    </>
  ),
  model: (t) => (
    <>
      <path
        d="M9 16 L24 10 M9 16 L24 24 M9 16 L24 38 M9 32 L24 10 M9 32 L24 24 M9 32 L24 38 M24 10 L39 16 M24 24 L39 16 M24 38 L39 16 M24 10 L39 32 M24 24 L39 32 M24 38 L39 32"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeOpacity={0.55}
      />
      <circle cx={9} cy={16} r={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={9} cy={32} r={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={24} cy={10} r={4} style={{ fill: ink(t), stroke: ink(t) }} />
      <circle cx={24} cy={24} r={4} style={{ fill: ink(t), stroke: ink(t) }} />
      <circle cx={24} cy={38} r={4} style={{ fill: ink(t), stroke: ink(t) }} />
      <circle cx={39} cy={16} r={4} style={{ fill: soft(t), stroke: ink(t) }} />
      <circle cx={39} cy={32} r={4} style={{ fill: soft(t), stroke: ink(t) }} />
    </>
  ),
  policy: (t) => (
    <>
      <rect x={6} y={5} width={29} height={38} rx={3} style={{ fill: soft(t), stroke: ink(t) }} />
      <path
        d="M11 13 L13 15 L16.5 11 M11 21 L13 23 L16.5 19 M11 29 L13 31 L16.5 27"
        fill="none"
        style={{ stroke: ink(t) }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 13 H30 M20.5 21 H30 M20.5 29 H23"
        style={{ stroke: ink(t) }}
        strokeLinecap="round"
        strokeOpacity={0.7}
      />
      <path
        d="M34 25 L42.5 28 V33.5 C42.5 38.5 38.5 42 34 44 C29.5 42 25.5 38.5 25.5 33.5 V28 Z"
        style={{ fill: ink(t), stroke: PAPER }}
        strokeLinejoin="round"
      />
      <path d="M34 29.5 V39.5" style={{ stroke: PAPER }} strokeLinecap="round" strokeOpacity={0.7} />
    </>
  ),
  pipeline: (t) => (
    <>
      <path d="M14 24 H34" style={{ stroke: ink(t) }} />
      <rect x={4} y={14} width={10} height={20} rx={2.5} style={{ fill: ink(t), stroke: ink(t) }} />
      <rect x={19} y={14} width={10} height={20} rx={2.5} style={{ fill: soft(t), stroke: ink(t) }} />
      <rect x={34} y={14} width={10} height={20} rx={2.5} style={{ fill: PAPER, stroke: ink(t) }} />
      <path
        d="M15 21 L18.5 24 L15 27 Z M30 21 L33.5 24 L30 27 Z"
        style={{ fill: ink(t), stroke: ink(t) }}
        strokeLinejoin="round"
      />
      <path
        d="M6.8 24 L8.5 25.8 L11.3 22.3"
        fill="none"
        style={{ stroke: PAPER }}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

/** Every glyph name, in declaration order. */
export const GLYPH_NAMES = Object.keys(GLYPHS) as GlyphName[];

export function isGlyph(name: string | undefined): name is GlyphName {
  return !!name && Object.hasOwn(GLYPHS, name);
}

/** Draws glyph `name` centred on (cx, cy), `size` units wide. */
export function Glyph({
  name,
  tone,
  cx,
  cy,
  size,
}: {
  name: GlyphName;
  tone: Tone;
  cx: number;
  cy: number;
  size: number;
}) {
  const s = size / 48;
  return (
    <g transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${s})`} strokeWidth={1.5}>
      {GLYPHS[name](tone)}
    </g>
  );
}
