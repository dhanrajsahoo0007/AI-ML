import type { LayoutSpec } from "@/components/diagrams/types";
import { waterfall, waterfallSize } from "@/components/diagrams/presets/production";
import type { WaterfallSpan } from "@/components/diagrams/presets/production";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Where one suggestion's time goes, from the last keystroke to the list on screen (tries-and-typeahead, Technical
// mechanics "Debounce and caching on the client and the edge"). One frame, no steps.
// Rows: the client waits 100 ms for a pause in typing (debounce) · the request crosses the network to London in 20 ms
// · the server walks the trie to the prefix node and reads its stored list in 2 ms · the reply takes 20 ms back · the
// browser draws the list in 8 ms.
// Working (illustrative values): 100 + 20 + 2 + 20 + 8 = 150 ms from the last keystroke; the request is in flight for
// 20 + 2 + 20 = 42 ms, of which the trie lookup is 2 ms (under 5 %). The debounce is two-thirds of the total.
// Layout: a `waterfall` (presets/production.ts) from (10, 0), fitted to 760 wide, with a dashed mark where the
// request leaves the browser and the total as the list appearing.
// Colours (PATTERN_TONE): browser work orange (traffic), the network neutral (plumbing), the trie lookup teal
// (compute). Two tones plus neutral.

const spans: WaterfallSpan[] = [
  {
    id: "debounce",
    label: "Wait for a pause",
    startMs: 0,
    durationMs: 100,
    tone: PATTERN_TONE.traffic,
    note: "debounce",
  },
  { id: "out", label: "Network to London", startMs: 100, durationMs: 20, tone: PATTERN_TONE.infra },
  {
    id: "lookup",
    label: "Trie lookup",
    startMs: 120,
    durationMs: 2,
    tone: PATTERN_TONE.compute,
    highlight: true,
  },
  { id: "back", label: "Network back", startMs: 122, durationMs: 20, tone: PATTERN_TONE.infra },
  { id: "render", label: "Draw the list", startMs: 142, durationMs: 8, tone: PATTERN_TONE.traffic },
];

const opts = {
  width: 760,
  tickMs: 25,
  total: { label: "list on screen 150 ms" },
  marks: [{ ms: 100, label: "request sent" }],
};
const size = waterfallSize(spans, opts);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Where one suggestion’s 150 ms goes",
  width: 780,
  height: size.height + 10,
  shapes: waterfall("lat", 10, 0, spans, opts),
};

export default spec;
