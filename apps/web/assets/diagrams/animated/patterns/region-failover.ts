import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP } from "@/components/diagrams/presets/patterns";

// A regional failover from London to Frankfurt, in the order it happens (multi-region-and-failover, Architecture).
// Five steps: 1 London stops answering: orders and health checks time out · 2 the failover tool sees checks from
// several places agree, asks Frankfurt how far behind it is (2 s) and the on-call engineer decides to fail over ·
// 3 fence London with a new epoch (the call cannot reach London, so the epoch is what protects the data) and promote
// Frankfurt's replica to writer · 4 point the shop's DNS name at Frankfurt; resolvers keep the old answer for up to
// the 60 s TTL; then orders land in Frankfurt · 5 London comes back still believing it is the writer at epoch 7; it
// is told to rejoin as a replica, and its 600 unsent orders go to reconciliation.
// Working: lag 2 s (illustrative) × 300 orders/s sale peak = 600 orders at risk; DNS TTL 60 s (illustrative).
// Layout: five lanes. Colours (PATTERN_TONE): shoppers orange (traffic), DNS neutral (plumbing), the two databases
// violet (stores), the failover tool green (the pattern's own part); the red timeouts are the calls London never
// answers.
// Fact check (2026-11-16, Aurora Global Database docs, "Using switchover or failover"): a managed failover "doesn't
// wait for data to synchronize" and can lose unreplicated writes; Aurora attempts "write fencing" of the old primary
// but it is best-effort, so split brain is possible; Aurora snapshots the old volume so missing data can be recovered.

const lagSeconds = 2; // illustrative
const atRisk = lagSeconds * SHOP.peakOrdersPerSecond; // 600
const ttl = 60; // illustrative DNS TTL, seconds
const [home, second] = [SHOP.homeRegion, SHOP.secondRegion];

const spec: SequenceSpec = {
  kind: "sequence",
  title: `Failing over from ${home} to ${second}`,
  lanes: [
    { id: "shop", label: "Shoppers", icon: "users", tone: PATTERN_TONE.traffic },
    { id: "dns", label: "DNS", icon: "dns", tone: PATTERN_TONE.infra },
    { id: "lon", label: `${home} DB`, icon: "database", tone: PATTERN_TONE.store },
    { id: "fra", label: `${second} DB`, icon: "database", tone: PATTERN_TONE.store },
    { id: "fo", label: "Failover tool", icon: "coordinator", tone: PATTERN_TONE.pattern },
  ],
  messages: [
    { from: "shop", to: "lon", label: "place order", kind: "timeout", step: 1 },
    { from: "fo", to: "lon", label: "health check", kind: "timeout", step: 1 },
    { from: "fra", to: "fo", label: "checks from 3 places fail", kind: "note", step: 1 },

    { from: "fo", to: "fra", label: "how far behind?", step: 2 },
    { from: "fra", to: "fo", label: `${lagSeconds} s at the cut`, kind: "return", step: 2 },
    { from: "fra", to: "fo", label: "on-call decides: fail over", kind: "note", step: 2 },

    { from: "fo", to: "lon", label: "fence: epoch 8", kind: "timeout", step: 3 },
    { from: "fo", to: "fra", label: "promote, epoch 8", step: 3 },
    { from: "fra", to: "fo", label: "writer at epoch 8", kind: "return", step: 3 },

    { from: "fo", to: "dns", label: `shop → ${second}`, step: 4 },
    { from: "dns", to: "dns", label: `old answer for ≤ ${ttl} s`, kind: "note", step: 4 },
    { from: "shop", to: "dns", label: "resolve shop", step: 4 },
    { from: "dns", to: "shop", label: second, kind: "return", step: 4 },
    { from: "shop", to: "fra", label: "place order", step: 4 },
    { from: "fra", to: "shop", label: "ok", kind: "return", step: 4 },

    { from: "lon", to: "fo", label: "back: writer, epoch 7", step: 5 },
    { from: "fo", to: "lon", label: "stale: rejoin as replica", kind: "return", step: 5 },
    { from: "lon", to: "fra", label: `${atRisk} unsent orders`, kind: "async", step: 5 },
  ],
  steps: [
    { title: `${home} stops answering` },
    { title: "A person decides to fail over" },
    { title: `Fence ${home}, promote ${second}` },
    { title: `Point shoppers at ${second}` },
    { title: `${home} returns: count the lost orders` },
  ],
};

export default spec;
