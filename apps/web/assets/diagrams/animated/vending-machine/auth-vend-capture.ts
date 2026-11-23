import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A card sale: authorise, vend, then capture or release (vending-machine, Step 3 and Deep dive 2).
// Three steps: 1 a good vend: the buyer picks B4 at $1.75 and taps; the controller asks the payment service to
// authorise with key m42-v1907 (machine 42, vend 1907); the service places a hold at the card processor; the motor
// turns, the drop sensor sees the item, the controller logs "vend ok" before it calls capture with the same key ·
// 2 a stuck item: the next buyer picks C2 at $2.00; the hold is approved, but the drop sensor sees nothing after one
// retry; the controller logs the failure and asks for a release, so the buyer is never charged · 3 the link drops
// after a good vend: the capture call times out (red); the controller keeps the capture in its local log and replays
// it 20 minutes later with the same key, and the service captures once.
// Working: holds last about 48 hours (an assumption on this page); a capture that has not arrived after 36 hours is
// released by the sweep, so the operator loses at most one $1.75 sale, never charges for a failed vend.
// Layout: five lanes. Colours (PATTERN_TONE): the buyer orange (traffic), the controller teal (compute), the local log
// violet (store), the payment service green (the part this figure is about), the card processor grey (external);
// the unanswered capture is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A card sale: authorise, vend, capture or release",
  lanes: [
    { id: "buyer", label: "Buyer", icon: "users", tone: PATTERN_TONE.traffic },
    { id: "ctrl", label: "Controller", icon: "controller", tone: PATTERN_TONE.compute },
    { id: "log", label: "Local log", icon: "log", tone: PATTERN_TONE.store },
    { id: "pay", label: "Payments", icon: "card", tone: PATTERN_TONE.pattern },
    { id: "proc", label: "Card processor", icon: "coin", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "buyer", to: "ctrl", label: "B4 $1.75, tap card", step: 1 },
    { from: "ctrl", to: "pay", label: "authorise, key m42-v1907", step: 1 },
    { from: "pay", to: "proc", label: "hold $1.75", step: 1 },
    { from: "pay", to: "ctrl", label: "approved", kind: "return", step: 1 },
    { from: "ctrl", to: "log", label: "v1907 vend ok, fsync", step: 1 },
    { from: "ctrl", to: "buyer", label: "item drops", kind: "return", step: 1 },
    { from: "ctrl", to: "pay", label: "capture, same key", step: 1 },
    { from: "pay", to: "proc", label: "capture $1.75", step: 1 },

    { from: "buyer", to: "ctrl", label: "C2 $2.00, tap card", step: 2 },
    { from: "ctrl", to: "pay", label: "authorise, key m42-v1908", step: 2 },
    { from: "pay", to: "ctrl", label: "approved", kind: "return", step: 2 },
    { from: "ctrl", to: "log", label: "v1908 no drop after retry", step: 2 },
    { from: "ctrl", to: "pay", label: "release, same key", step: 2 },
    { from: "pay", to: "proc", label: "cancel hold", step: 2 },
    { from: "ctrl", to: "buyer", label: "not charged", kind: "return", step: 2 },

    { from: "ctrl", to: "log", label: "v1909 vend ok, capture due", step: 3 },
    { from: "ctrl", to: "pay", label: "capture: no link", kind: "timeout", step: 3 },
    { from: "ctrl", to: "pay", label: "20 min later: replay, same key", step: 3 },
    { from: "pay", to: "proc", label: "capture once", step: 3 },
    { from: "pay", to: "ctrl", label: "captured", kind: "return", step: 3 },
  ],
  steps: [
    { title: "Good vend: capture" },
    { title: "Stuck item: release" },
    { title: "Link drops: replay the capture" },
  ],
};

export default spec;
