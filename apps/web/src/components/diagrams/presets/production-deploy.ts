// Constants and arithmetic for the Containerization & Orchestration page (serving/deploy-*.ts and the page's text).
// Everything that is not a model size is ILLUSTRATIVE (bandwidths, durations) and labelled so on the figures; measure
// your own. Builds on COLD from presets/production-lb.ts (same 16 GB model, same 8 GB engine image) so the two pages
// agree.

import { COLD } from "./production-lb";

/**
 * Three ways to get 16 GB of weights next to the engine. Illustrative rates: registry pull 0.2 GB/s (layers are
 * downloaded and unpacked), object storage 1 GB/s, load from local disk into GPU memory 2 GB/s (same rates as COLD).
 *   bake  : image = 8 + 16 = 24 GB.  pull 24 ÷ 0.2 = 120 s · weights already inside · load 16 ÷ 2 = 8 s  → 128 s
 *   fetch : image = 8 GB.            pull  8 ÷ 0.2 =  40 s · download 16 ÷ 1 = 16 s · load 8 s            →  64 s
 *   volume: image = 8 GB.            pull 40 s · mount a volume already holding the weights (0 s) ·
 *           load from the volume 16 ÷ 1 GB/s network read = 16 s (the read, not the GPU copy, is the limit)  →  56 s
 * Warm-up (compile kernels, capture graphs; 35 s in COLD) comes after and is the same for all three.
 */
export const RATES = { registryGBs: 0.2, objectGBs: 1, diskGBs: 2, volumeGBs: 1 } as const;
export const WEIGHTS_GB = COLD.weightsGB; // 16
export const IMAGE_GB = COLD.imageGB; // 8
export const WARM_S = COLD.slow.warm; // 35

const sec = (gb: number, rate: number) => Math.round(gb / rate);

export const STRATEGIES = [
  {
    id: "bake",
    label: "Bake into the image",
    sub: `image ${IMAGE_GB + WEIGHTS_GB} GB`,
    pull: sec(IMAGE_GB + WEIGHTS_GB, RATES.registryGBs),
    fetch: 0,
    load: sec(WEIGHTS_GB, RATES.diskGBs),
    fetchLabel: "",
  },
  {
    id: "fetch",
    label: "Pull from object storage",
    sub: `image ${IMAGE_GB} GB, at start`,
    pull: sec(IMAGE_GB, RATES.registryGBs),
    fetch: sec(WEIGHTS_GB, RATES.objectGBs),
    load: sec(WEIGHTS_GB, RATES.diskGBs),
    fetchLabel: "download",
  },
  {
    id: "volume",
    label: "Mount a shared volume",
    sub: `image ${IMAGE_GB} GB + volume`,
    pull: sec(IMAGE_GB, RATES.registryGBs),
    fetch: 0,
    load: sec(WEIGHTS_GB, RATES.volumeGBs),
    fetchLabel: "",
  },
] as const;

export const strategyTotal = (s: (typeof STRATEGIES)[number]) => s.pull + s.fetch + s.load;

/**
 * Probe timeline (seconds after the container starts), reusing COLD.slow's download, load and warm-up:
 *   download 16 s + load 8 s + warm-up 35 s = 59 s until the engine can answer.
 *   Startup probe every 10 s (periodSeconds) → first success at t = 60 s; its budget is 10 × 30 = 300 s.
 *   Readiness probe every 5 s once startup has passed → in service by t = 65 s.
 *   Counter-example, no startup probe: a liveness probe with initialDelaySeconds 10, periodSeconds 10 and
 *   failureThreshold 3 fails at 10, 20 and 30 s → the container is killed at 30 s, half-way through loading.
 */
export const PROBE = {
  loadEnd: COLD.slow.download + COLD.slow.load, // 24
  engineReady: COLD.slow.download + COLD.slow.load + COLD.slow.warm, // 59
  startupPeriod: 10,
  startupFailureThreshold: 30,
  startupPass: 60,
  readinessPeriod: 5,
  inService: 65,
  livenessKill: 30,
} as const;
