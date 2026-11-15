import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import {
  IMAGE_GB,
  RATES,
  STRATEGIES,
  WEIGHTS_GB,
  strategyTotal,
} from "@/components/diagrams/presets/production-deploy";

// Three ways to get a 16 GB model next to the engine (containerization-orchestration, Deep dive). A small code image
// and many gigabytes of weights: bake the weights into the image, download them from object storage when the container
// starts, or mount a volume that already holds them. Time to "ready to load" for one new replica on a node that has
// nothing cached, before warm-up (warm-up is the same for all three, see deploy-readiness).
//
// Steps: 1 bake in · 2 download at start · 3 mount a volume. Each step adds a row; rows share one time scale.
// Arithmetic (ILLUSTRATIVE rates, in presets/production-deploy.ts): registry pull 0.2 GB/s, object storage 1 GB/s,
// local disk to GPU 2 GB/s, network volume read 1 GB/s. Engine image 8 GB; weights 8 B parameters × 2 bytes = 16 GB.
//   bake   : image 8 + 16 = 24 GB → pull 120 s, load 8 s                 = 128 s
//   fetch  : image 8 GB → pull 40 s, download 16 s, load 8 s             =  64 s
//   volume : image 8 GB → pull 40 s, load from volume 16 ÷ 1 = 16 s      =  56 s
// Layout (880 wide): label column x 20..215; bars from x 230 at 4.4 px per second (128 s = 563 px, ends x 793); each
// row is 82 high: bar at +6, a note under it at +34. A key at the bottom. Colours: image pull violet (a registry is a
// store), weights download blue (data), load into GPU teal (compute); a lime total at the end of each bar.

const AX = 230;
const PX = 4.4;
const ROW = 82;
const TOP = 14;
const BAR = 24;
const x = (s: number) => Math.round(AX + s * PX);

const note: Record<string, string> = {
  bake: "Every node pulls 24 GB. A new model version means a new 24 GB image.",
  fetch: "Small image, but each replica downloads 16 GB and needs credentials to the bucket.",
  volume: "Replicas start fast, but the volume's read speed is shared by every replica starting at once.",
};

function row(i: number): LayoutShape[] {
  const s = STRATEGIES[i];
  const y = TOP + i * ROW;
  const step = i + 1;
  const out: LayoutShape[] = [
    { id: `${s.id}-label`, type: "text", x: 20, y: y + 2, w: 195, h: 18, label: s.label, tone: PROD_TONE.infra, step },
    {
      id: `${s.id}-sub`,
      type: "text",
      x: 20,
      y: y + 20,
      w: 195,
      h: 18,
      label: s.sub,
      tone: PROD_TONE.infra,
      quiet: true,
      step,
    },
  ];
  const segs: { key: string; label: string; secs: number; tone: LayoutTone }[] = [
    { key: "pull", label: "image", secs: s.pull, tone: PROD_TONE.store },
    { key: "fetch", label: "weights", secs: s.fetch, tone: PROD_TONE.data },
    { key: "load", label: "load", secs: s.load, tone: PROD_TONE.compute },
  ];
  let t = 0;
  for (const g of segs) {
    if (g.secs === 0) continue;
    const w = Math.round(g.secs * PX);
    out.push({
      id: `${s.id}-${g.key}`,
      type: "cell",
      x: x(t),
      y: y + 6,
      w,
      h: BAR,
      label: `${g.secs} s`,
      tone: g.tone,
      fill: "pastel",
      step,
    });
    t += g.secs;
  }
  out.push(
    {
      id: `${s.id}-total`,
      type: "box",
      x: x(t) + 8,
      y: y + 6,
      w: 64,
      h: BAR,
      label: `${strategyTotal(s)} s`,
      tone: PROD_TONE.check,
      fill: "pastel",
      quiet: true,
      step,
    },
    {
      id: `${s.id}-note`,
      type: "text",
      x: AX,
      y: y + 38,
      w: 600,
      h: 18,
      label: note[s.id],
      tone: PROD_TONE.infra,
      quiet: true,
      step,
    }
  );
  // text shapes are centred in their box: size the note box to its words and start it at the bar's left edge
  const noteShape = out[out.length - 1];
  noteShape.w = Math.ceil(note[s.id].length * 5.8) + 6;
  return out;
}

const KEY_Y = TOP + 3 * ROW + 6;
const key = (id: string, kx: number, label: string, tone: LayoutTone, w: number): LayoutShape[] => [
  { id: `${id}-chip`, type: "cell", x: kx, y: KEY_Y, w: 22, h: 14, tone, fill: "pastel" },
  { id: `${id}-txt`, type: "text", x: kx + 28, y: KEY_Y - 2, w, h: 18, label, tone: PROD_TONE.infra, quiet: true },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three ways to get 16 GB of weights next to the engine",
  width: 880,
  height: KEY_Y + 66,
  steps: [
    { title: "Bake the weights into the image" },
    { title: "Download them from object storage at start" },
    { title: "Mount a volume that already holds them" },
  ],
  shapes: [
    ...row(0),
    ...row(1),
    ...row(2),
    ...key("k1", AX, "pull the engine image (registry)", PROD_TONE.store, 200),
    ...key("k2", AX + 250, "download weights", PROD_TONE.data, 120),
    ...key("k3", AX + 420, "load into GPU memory", PROD_TONE.compute, 150),
    {
      id: "foot",
      type: "text",
      x: 20,
      y: KEY_Y + 24,
      w: 840,
      h: 18,
      label: `Illustrative rates: registry ${RATES.registryGBs} GB/s, object storage ${RATES.objectGBs} GB/s, disk to GPU ${RATES.diskGBs} GB/s, volume ${RATES.volumeGBs} GB/s.`,
      tone: PROD_TONE.infra,
      quiet: true,
    },
    {
      id: "foot2",
      type: "text",
      x: 20,
      y: KEY_Y + 44,
      w: 840,
      h: 18,
      label: `120 = 24 ÷ 0.2; 40 = ${IMAGE_GB} ÷ 0.2; 16 = ${WEIGHTS_GB} ÷ 1; 8 = ${WEIGHTS_GB} ÷ 2. Before warm-up, on a node with nothing cached.`,
      tone: PROD_TONE.infra,
      quiet: true,
    },
  ],
};

export default spec;
