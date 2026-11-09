import type { SequenceSpec } from "@/components/diagrams/types";

// The 45-minute system design interview as a timeline. Three lanes: the interviewer on the left, the candidate in
// the middle (they talk to both sides), the whiteboard on the right. Each phase opens with an orange banner that
// names its minutes; the messages under it are what is said or drawn in that phase. The prompt is "design a chat
// app", the example the interview framework page follows.
//
// Five build steps group the eight phases: clarify + requirements, estimate, API + data, high level,
// deep dive + wrap-up. Minutes: 0-3, 3-8, 8-12, 12-16, 16-20, 20-30, 30-41, 41-45 (total 45).
const spec: SequenceSpec = {
  kind: "sequence",
  title: "The 45 minutes of a system design interview",
  width: 760,
  steps: [
    { title: "Clarify and pin the requirements (minutes 0-8)" },
    { title: "Estimate the scale (minutes 8-12)" },
    { title: "API and data model (minutes 12-20)" },
    { title: "High-level design (minutes 20-30)" },
    { title: "Deep dive and wrap-up (minutes 30-45)" },
  ],
  lanes: [
    { id: "interviewer", label: "Interviewer", icon: "user-check", tone: "blue" },
    { id: "candidate", label: "Candidate", icon: "lightbulb", tone: "green" },
    { id: "whiteboard", label: "Whiteboard", icon: "presentation", tone: "violet" },
  ],
  messages: [
    // Step 1: clarify (0-3) and requirements (3-8).
    { from: "interviewer", to: "whiteboard", kind: "note", label: "Minutes 0-3: clarify the problem", step: 1 },
    { from: "interviewer", to: "candidate", label: "Design a chat app", step: 1 },
    { from: "candidate", to: "interviewer", label: "1:1 or groups? Mobile? Scale?", step: 1 },
    { from: "interviewer", to: "candidate", kind: "return", label: "Both, mobile first, 100M daily", step: 1 },
    { from: "interviewer", to: "whiteboard", kind: "note", label: "Minutes 3-8: requirements", step: 1 },
    { from: "candidate", to: "whiteboard", label: "Features F1-F5, targets N1-N4", step: 1 },
    { from: "interviewer", to: "candidate", kind: "return", label: "Skip voice calls for today", step: 1 },

    // Step 2: estimate (8-12).
    { from: "interviewer", to: "whiteboard", kind: "note", label: "Minutes 8-12: estimate", step: 2 },
    { from: "candidate", to: "whiteboard", label: "100M x 40 = 4B/day = 46K/s", step: 2 },
    { from: "candidate", to: "interviewer", label: "Peak about 140K/s. Agreed?", step: 2 },

    // Step 3: API (12-16) and data model (16-20).
    { from: "interviewer", to: "whiteboard", kind: "note", label: "Minutes 12-16: API", step: 3 },
    { from: "candidate", to: "whiteboard", label: "send, history, stream", step: 3 },
    { from: "interviewer", to: "whiteboard", kind: "note", label: "Minutes 16-20: data model", step: 3 },
    { from: "candidate", to: "whiteboard", label: "messages keyed by chat id", step: 3 },
    { from: "interviewer", to: "candidate", label: "Why that database?", step: 3 },

    // Step 4: high-level design (20-30).
    { from: "interviewer", to: "whiteboard", kind: "note", label: "Minutes 20-30: high-level design", step: 4 },
    { from: "candidate", to: "whiteboard", label: "LB, chat, store, registry, push", step: 4 },
    { from: "candidate", to: "interviewer", label: "One message, end to end", step: 4 },
    { from: "interviewer", to: "candidate", kind: "return", label: "Good. Now go deeper", step: 4 },

    // Step 5: deep dive (30-41) and wrap-up (41-45).
    { from: "interviewer", to: "whiteboard", kind: "note", label: "Minutes 30-41: deep dive", step: 5 },
    { from: "interviewer", to: "candidate", label: "A group has 500 people", step: 5 },
    { from: "candidate", to: "whiteboard", label: "Two options, one pick, why", step: 5 },
    { from: "interviewer", to: "whiteboard", kind: "note", label: "Minutes 41-45: wrap-up", step: 5 },
    { from: "candidate", to: "interviewer", label: "Bottlenecks, failures, next", step: 5 },
    { from: "interviewer", to: "candidate", kind: "return", label: "Any questions for me?", step: 5 },
  ],
};

export default spec;
