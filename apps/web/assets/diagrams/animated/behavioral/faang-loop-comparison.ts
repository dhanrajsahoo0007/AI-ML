import type { DiagramSpec } from "@/components/diagrams/types";

const spec: DiagramSpec = {
  title: "Where behavioral signal lives across the 4 major tech interview models",
  width: 920,
  height: 390,
  steps: [
    { title: "1. Amazon: Distributed LPs + Bar Raiser", covers: "Every round tests 2-3 LPs" },
    { title: "2. Meta & Netflix: Dedicated culture gate", covers: "Jedi & Keeper Test" },
    { title: "3. Google: G&L -> Hiring Committee", covers: "Packet-driven consensus" },
    { title: "4. Frontier AI Labs: Safety & velocity", covers: "Anthropic / OpenAI / DeepMind" },
  ],
  zones: [
    { id: "loop-type", title: "Company Loop Archetype", tone: "blue", x: 16, y: 20, w: 250, h: 350 },
    { id: "mechanism", title: "Primary Evaluation Mechanism", tone: "orange", x: 335, y: 20, w: 250, h: 350 },
    { id: "decider", title: "Who Holds Veto / Leveling Power", tone: "green", x: 654, y: 20, w: 250, h: 350 },
  ],
  nodes: [
    { id: "amz", label: "Amazon (16 LPs)", sub: "15-20 min in every round", icon: "layers", tone: "blue", x: 141, y: 80, w: 214, h: 52, step: 1 },
    { id: "amz-mech", label: "Assigned LP Split", sub: "No story reuse >2x", icon: "search", tone: "orange", x: 460, y: 80, w: 214, h: 52, step: 1 },
    { id: "amz-dec", label: "Bar Raiser + HM", sub: "Independent veto power", icon: "scale", tone: "green", x: 779, y: 80, w: 214, h: 52, step: 1 },

    { id: "meta", label: "Meta Jedi / Netflix", sub: "Dedicated values round", icon: "users", tone: "blue", x: 141, y: 165, w: 214, h: 52, step: 2 },
    { id: "meta-mech", label: "Conflict & Candor", sub: "Scope sets E4/E5/E6 bar", icon: "git-branch", tone: "orange", x: 460, y: 165, w: 214, h: 52, step: 2 },
    { id: "meta-dec", label: "Calibration Review", sub: "Can down-level strong code", icon: "trending-up", tone: "green", x: 779, y: 165, w: 214, h: 52, step: 2 },

    { id: "goog", label: "Google G&L Round", sub: "Googleyness & Leadership", icon: "compass", tone: "blue", x: 141, y: 250, w: 214, h: 52, step: 3 },
    { id: "goog-mech", label: "Ambiguity & Inclusion", sub: "Hypothetical + past stories", icon: "file-text", tone: "orange", x: 460, y: 250, w: 214, h: 52, step: 3 },
    { id: "goog-dec", label: "Hiring Committee", sub: "Reads written packet cold", icon: "check-circle", tone: "green", x: 779, y: 250, w: 214, h: 52, step: 3 },

    { id: "ai-labs", label: "Anthropic / OpenAI", sub: "Mission & values round", icon: "sparkles", tone: "blue", x: 141, y: 335, w: 214, h: 52, step: 4 },
    { id: "ai-mech", label: "Safety vs Capability", sub: "Epistemic honesty & evals", icon: "shield", tone: "orange", accent: true, x: 460, y: 335, w: 214, h: 52, step: 4 },
    { id: "ai-dec", label: "Founders / Bar Review", sub: "High-agency + low-ego bar", icon: "award", tone: "green", x: 779, y: 335, w: 214, h: 52, step: 4 },
  ],
  edges: [
    { from: "amz", to: "amz-mech", packet: true, step: 1 },
    { from: "amz-mech", to: "amz-dec", packet: true, step: 1 },
    { from: "meta", to: "meta-mech", packet: true, step: 2 },
    { from: "meta-mech", to: "meta-dec", packet: true, step: 2 },
    { from: "goog", to: "goog-mech", packet: true, step: 3 },
    { from: "goog-mech", to: "goog-dec", packet: true, step: 3 },
    { from: "ai-labs", to: "ai-mech", packet: true, step: 4 },
    { from: "ai-mech", to: "ai-dec", packet: true, step: 4 },
  ],
};

export default spec;
