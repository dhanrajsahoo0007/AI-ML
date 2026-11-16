import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Who holds the list of instances: client-side discovery, server-side discovery and plain DNS, compared on five
// questions (service-discovery-and-coordination, Technical mechanics).
// Layout: optionColumns, three columns of 210. Colours (PATTERN_TONE): every option is the pattern (green); the red
// cell is DNS's stale answer, the one way an option keeps sending traffic to a dead instance.
// Fact check (2026-11-16): Kubernetes Services are server-side (kube-proxy routes using EndpointSlices); Envoy and gRPC
// clients with xDS are client-side; DNS answers may be cached for their TTL.

const opts = {
  rowLabels: ["Who holds the list", "Extra hop", "Who balances", "Callers need", "A change reaches callers"],
  colW: 210,
  labelW: 150,
  columns: [
    {
      id: "client",
      title: "Client-side",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Every caller" },
        { label: "None" },
        { label: "The caller", sub: "e.g. two random choices" },
        { label: "A library or a sidecar" },
        { label: "Through a watch", sub: "about a second" },
      ],
    },
    {
      id: "server",
      title: "Server-side",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: "A balancer or proxy" },
        { label: "One more hop" },
        { label: "The balancer" },
        { label: "One stable address" },
        { label: "The balancer updates", sub: "callers change nothing" },
      ],
    },
    {
      id: "dns",
      title: "Plain DNS",
      tone: PATTERN_TONE.pattern,
      rows: [
        { label: "Resolvers and caches" },
        { label: "None after the lookup" },
        { label: "Order of the IPs" },
        { label: "Nothing extra" },
        { label: "After the TTL, or later", sub: "caches can ignore it", tone: PATTERN_TONE.fail },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Client-side discovery, server-side discovery and DNS",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("cvs", PAD, PAD, opts),
};

export default spec;
