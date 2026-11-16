import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Three balancing algorithms when one of 40 servers turns slow (load-balancing, Core concepts).
//
// Working (Brightpost numbers from presets/patterns.ts; timings illustrative):
//   2,300 reads/s over 40 servers = 57.5 requests/s each.
//   One server slows from 10 ms to 100 ms a request (10 times slower).
//   Round robin ignores load: the slow server still gets 57.5/s, 1 in 40 requests = 2.5 % of all requests are slow.
//   Least connections keeps open requests level, so each server's rate is about proportional to its speed:
//     slow share = 0.1 ÷ (39 + 0.1) = 0.26 %; 2,300 × 0.1 ÷ 39.1 = 5.9 requests/s.
//   Two random choices compares two random servers and picks the one with fewer open requests: close to least
//   connections with a view of only two servers (illustrative).
// Layout: optionColumns, three columns of 210. Colours (PATTERN_TONE): every algorithm is the pattern (green); red
// marks the weak spot of each.
// Fact check (2026-11-16): Envoy's least-request balancer picks the best of 2 random hosts by default ("power of two
// choices"); AWS ALB offers round robin (default) and least outstanding requests.

const perServer = SHOP.peakReadsPerSecond / SHOP.appServers; // 57.5
const slowShareRR = 1 / SHOP.appServers; // 2.5 %
const speed = 0.1;
const slowRateLC = (SHOP.peakReadsPerSecond * speed) / (SHOP.appServers - 1 + speed); // 5.9

const opts = {
  rowLabels: ["Picks", "Needs to know", "Slow server gets", "Many balancers"],
  colW: 210,
  labelW: 130,
  columns: [
    {
      id: "rr",
      title: "Round robin",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "The next server in turn" },
        { label: "Nothing" },
        {
          label: `${perServer} req/s, as before`,
          sub: `${(slowShareRR * 100).toFixed(1)} % of requests slow`,
          tone: PATTERN_TONE.fail,
        },
        { label: "Fine", sub: "each spreads evenly" },
      ],
    },
    {
      id: "lc",
      title: "Least connections",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: "Fewest open requests" },
        { label: "Open count, every server" },
        { label: `About ${slowRateLC.toFixed(1)} req/s`, sub: "its share follows its speed" },
        { label: "All pick the same one", sub: "a herd on the emptiest server", tone: PATTERN_TONE.fail },
      ],
    },
    {
      id: "p2c",
      title: "Two random choices",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Better of 2 random servers" },
        { label: "Open count, 2 servers" },
        { label: "Close to least connections", sub: "illustrative" },
        { label: "Spreads the choices", sub: "randomness breaks the herd" },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Round robin, least connections and two random choices",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("alg", PAD, PAD, opts),
};

export default spec;
