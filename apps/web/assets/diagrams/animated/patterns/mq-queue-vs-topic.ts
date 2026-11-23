import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A queue against a topic (message-queues, first figure). Brightpost's checkout produces three messages.
// Left: a queue of email jobs; each job goes to exactly one of three workers (competing consumers share the work).
// Right: a topic of order-placed events; each of three subscriber groups (payments, email, analytics) gets every
// event (pub/sub copies the stream).
// Layout (880 × 330): two dotted groups side by side, each producer → broker → three consumers, with a summary line.
// Colours (PATTERN_TONE): producers and consumers teal (compute), the queue and the topic violet (durable stores).

const shapes: LayoutShape[] = [];
const side = (p: string, x0: number, broker: string, brokerSub: string, consumers: [string, string][]) => {
  shapes.push(
    {
      id: `${p}-prod`,
      type: "box",
      x: x0 + 14,
      y: 140,
      w: 110,
      h: 48,
      label: "Checkout",
      sub: "producer",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
    },
    {
      id: `${p}-broker`,
      type: "box",
      x: x0 + 160,
      y: 124,
      w: 112,
      h: 80,
      label: broker,
      sub: brokerSub,
      tone: PATTERN_TONE.store,
      fill: "pastel",
      highlight: true,
    },
    { id: `${p}-a0`, type: "arrow", x: 0, y: 0, from: `${p}-prod`, to: `${p}-broker`, packet: true }
  );
  consumers.forEach(([label, sub], i) => {
    shapes.push(
      {
        id: `${p}-c${i}`,
        type: "box",
        x: x0 + 300,
        y: 60 + i * 80,
        w: 112,
        h: 48,
        label,
        sub,
        tone: PATTERN_TONE.compute,
        fill: "pastel",
      },
      { id: `${p}-a${i + 1}`, type: "arrow", x: 0, y: 0, from: `${p}-broker`, to: `${p}-c${i}` }
    );
  });
};

side("q", 20, "Queue", "email jobs", [
  ["Worker 1", "gets job 1"],
  ["Worker 2", "gets job 2"],
  ["Worker 3", "gets job 3"],
]);
side("t", 450, "Topic", "order placed", [
  ["Payments", "gets 1, 2, 3"],
  ["Email", "gets 1, 2, 3"],
  ["Analytics", "gets 1, 2, 3"],
]);
shapes.push(
  {
    id: "q-sum",
    type: "text",
    x: 20,
    y: 290,
    w: 410,
    h: 18,
    label: "3 jobs, 3 workers, one each: the work is shared",
    tone: PATTERN_TONE.infra,
  },
  {
    id: "t-sum",
    type: "text",
    x: 450,
    y: 290,
    w: 410,
    h: 18,
    label: "3 events, 3 groups, all three each: a copy per group",
    tone: PATTERN_TONE.infra,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A queue shares the work; a topic copies every event",
  width: 880,
  height: 330,
  groups: [
    { id: "gq", title: "Queue: competing consumers", tone: PATTERN_TONE.store, x: 20, y: 20, w: 410, h: 262 },
    {
      id: "gt",
      title: "Topic: one copy per subscriber group",
      tone: PATTERN_TONE.store,
      x: 450,
      y: 20,
      w: 410,
      h: 262,
    },
  ],
  shapes,
};

export default spec;
