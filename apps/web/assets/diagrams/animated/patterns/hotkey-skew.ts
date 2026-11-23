import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { meter, meterSize } from "@/components/diagrams/presets/production";
import { FLASH_SALE, PATTERN_TONE, SHOP } from "@/components/diagrams/presets/patterns";

// One product takes 30 % of the reads and one shard goes over its limit (hot-keys-and-coalescing, first figure).
// Working (presets/patterns.ts; the shard limit is illustrative):
//   2,300 reads/s at 12:00; the kettle takes 30 % = 690 reads/s, all on one key, so all on one shard.
//   The other 1,610 reads/s spread over 4 shards: about 403 each.
//   Shard 1 = 690 + 403 = 1,093 reads/s against a limit of 1,000; shards 2 to 4 sit at 403.
// Layout: four meters (presets/production.ts `meter`), one per shard. Colours (PATTERN_TONE): the kettle's reads
// orange (traffic on one key), other reads neutral, the part past the limit red (drawn by the meter).

const SHARDS = 4;
const LIMIT = 1_000;
const others = Math.round((SHOP.peakReadsPerSecond - FLASH_SALE.hotKeyReadsPerSecond) / SHARDS); // 403
const W = 560;
const size = meterSize({ width: W });
const GAP = 22;

const shapes: LayoutShape[] = [];
for (let i = 0; i < SHARDS; i++) {
  const hot = i === 0;
  const used = others + (hot ? FLASH_SALE.hotKeyReadsPerSecond : 0);
  shapes.push(
    ...meter(`s${i + 1}`, 30, 20 + i * (size.height + GAP), {
      label: hot ? `Shard ${i + 1}: holds the ${FLASH_SALE.item}` : `Shard ${i + 1}`,
      used,
      limit: LIMIT,
      max: 1_200,
      unit: "reads/s",
      width: W,
      segments: hot
        ? [
            {
              value: FLASH_SALE.hotKeyReadsPerSecond,
              tone: PATTERN_TONE.traffic,
              label: `${FLASH_SALE.item} ${FLASH_SALE.hotKeyReadsPerSecond}`,
            },
            { value: others, tone: PATTERN_TONE.infra, label: "other keys" },
          ]
        : [{ value: others, tone: PATTERN_TONE.infra, label: "other keys" }],
      limitLabel: "limit (illustrative)",
    })
  );
}

const spec: LayoutSpec = {
  kind: "layout",
  title: "One hot key puts one shard over its limit",
  width: W + 60,
  height: 20 + SHARDS * (size.height + GAP),
  shapes,
};

export default spec;
