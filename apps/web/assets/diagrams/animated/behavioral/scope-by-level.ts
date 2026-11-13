import type { LayoutSpec } from "@/components/diagrams/types";

const spec: LayoutSpec = {
  kind: "layout",
  title: "The same signal at three levels: how far the change reached",
  width: 760,
  height: 300,
  steps: [
    {
      title: "Mid level",
      covers: "A change inside your own area",
    },
    {
      title: "Senior",
      covers: "A change that moved your whole team",
    },
    {
      title: "Staff",
      covers: "A change that moved your org",
    },
  ],
  shapes: [
    {
      id: "mid",
      type: "box",
      x: 40,
      y: 36,
      w: 230,
      h: 60,
      label: "Mid level (IC4)",
      sub: "Your own area. Mostly you alone.",
      tone: "blue",
      step: 1,
    },
    {
      id: "senior",
      type: "box",
      x: 40,
      y: 112,
      w: 450,
      h: 60,
      label: "Senior (IC5)",
      sub: "Your whole team. Three or more people did the work.",
      tone: "orange",
      step: 2,
    },
    {
      id: "staff",
      type: "box",
      x: 40,
      y: 188,
      w: 680,
      h: 60,
      label: "Staff (IC6)",
      sub: "Your org. Two or more teams did the work.",
      tone: "violet",
      step: 3,
    },
    {
      id: "t",
      type: "text",
      x: 40,
      y: 262,
      w: 680,
      h: 22,
      label: "A senior loop with only mid-sized stories is graded as mid level.",
      tone: "orange",
      step: 3,
    },
  ],
};

export default spec;
