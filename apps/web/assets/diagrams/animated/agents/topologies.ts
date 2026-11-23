import type { LayoutSpec } from "@/components/diagrams/types";
import { TOPO_TILE, topologyTile } from "@/components/diagrams/presets/agents-multi";

// Four ways to wire agents together (multi-agent-systems, Core concepts). The tiles share one node size (TILE_NODE,
// the pattern tiles' size) and one style, so they compare at a glance: supervisor (one agent delegates to three and
// merges), pipeline (triage → orders → refunds, each hands on), peers (three agents talk directly, no boss) and
// hierarchy (a lead over two team leads over three workers). The Brightpost roles appear where they fit.
//
// Layout: a 2 × 2 grid of TOPO_TILE boxes (430 × 276), 20 units apart: supervisor and pipeline on the top row,
// peers and hierarchy below. Each tile has its title at the top and a one-line note at the bottom.
//
// Colour (agents legend): every node is an agent, so all green; coordinating agents are pastel, workers and peers
// soft. Arrows delegate; plain lines (peers) are two-way talk. One tone plus neutral text.

const GAP = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Four topologies: supervisor, pipeline, peers, hierarchy",
  width: 2 * TOPO_TILE.w + GAP,
  height: 2 * TOPO_TILE.h + GAP,
  shapes: [
    ...topologyTile("sup", "supervisor", 0, 0),
    ...topologyTile("pipe", "pipeline", TOPO_TILE.w + GAP, 0),
    ...topologyTile("peer", "peers", 0, TOPO_TILE.h + GAP),
    ...topologyTile("hier", "hierarchy", TOPO_TILE.w + GAP, TOPO_TILE.h + GAP),
  ],
};

export default spec;
