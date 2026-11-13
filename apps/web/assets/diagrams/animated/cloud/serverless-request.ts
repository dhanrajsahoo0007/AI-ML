import type { SequenceSpec } from "@/components/diagrams/types";

// Cold and warm starts, and why copies multiply (cloud/compute/serverless-functions).
// Brightpost's resize function on an ordinary morning. Photo 1 finds no copy, so the platform starts one: fetch the
// code, start the runtime, run the setup code (which opens a database connection). That is the cold start, about
// 1 s, before the 2 s of work. Photo 2 finds copy A free and warm: no setup, the same connection. Photos 3 and 4
// arrive together; one copy takes one photo at a time, so the platform starts copy B, with its own cold start and
// its own connection. After a quiet night both copies are gone and the next photo is cold again.
// Lane names are cloud-neutral and at most 15 characters. Times are clock times so the reader can add them up.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Cold start, warm start, and a second copy",
  width: 800,
  steps: [
    { title: "First photo: a cold start" },
    { title: "Second photo: the warm copy is reused" },
    { title: "Two photos at once: a second copy" },
    { title: "After a quiet night: cold again" },
  ],
  lanes: [
    { id: "event", label: "Event source", icon: "blob", tone: "violet" },
    { id: "platform", label: "Platform", icon: "router", tone: "blue" },
    { id: "a", label: "Copy A", icon: "function", tone: "teal" },
    { id: "b", label: "Copy B", icon: "function", tone: "teal" },
    { id: "db", label: "Database", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: no copy exists, so the platform builds one before any work starts.
    { from: "event", to: "platform", label: "08:00:00 photo 1", step: 1 },
    { from: "platform", to: "a", label: "no free copy: start A", step: 1 },
    { from: "a", to: "db", label: "setup: open connection", step: 1 },
    { from: "db", to: "a", label: "connected", kind: "return", step: 1 },
    { from: "a", to: "platform", label: "08:00:03 done (1 s + 2 s)", kind: "return", step: 1 },

    // Step 2: copy A is still there and free; setup is skipped and the connection is reused.
    { from: "event", to: "platform", label: "08:00:10 photo 2", step: 2, delay: 0.6 },
    { from: "platform", to: "a", label: "A is free: reuse it", step: 2 },
    { from: "a", to: "db", label: "same connection", step: 2 },
    { from: "a", to: "platform", label: "08:00:12 done (2 s)", kind: "return", step: 2 },

    // Step 3: two photos at once. One copy takes one photo, so the platform starts B, cold, with a new connection.
    { from: "event", to: "platform", label: "08:00:20 photos 3 and 4", step: 3, delay: 0.6 },
    { from: "platform", to: "a", label: "photo 3", step: 3 },
    { from: "platform", to: "b", label: "photo 4: start B", step: 3 },
    { from: "b", to: "db", label: "second connection", step: 3 },

    // Step 4: after a quiet night the platform has stopped both copies; the next photo pays the cold start again.
    { from: "event", to: "platform", label: "next day 07:30 photo 5", step: 4, delay: 0.6 },
    { from: "platform", to: "a", label: "no copy left: start A", step: 4 },
    { from: "a", to: "platform", label: "07:30:03 done (1 s + 2 s)", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "a", text: "Cold start: code, runtime, setup", step: 1, at: 1.5 },
    { lane: "a", text: "Warm: setup already done", step: 2, at: 6.5 },
    { lane: "b", text: "One photo per copy", step: 3, at: 11.5 },
    { lane: "platform", text: "Quiet night: A and B stopped", step: 4, at: 12.5 },
  ],
};

export default spec;
