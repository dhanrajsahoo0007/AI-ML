import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Pressing play, and an appliance failing mid-stream (netflix case study, Deep dive 1: push-fill and steering).
// Two steps: 1 play: the device asks the playback service in the cloud; it checks the plan and the title's licence
// for the member's country, asks steering for appliances, and returns a manifest with three ranked URLs; the device
// fetches the first segments from the top-ranked appliance inside its ISP · 2 that appliance stops answering at
// segment 212: the request times out (red), and so does URL 2 at the same ISP site; the device's 30 s buffer keeps
// the picture moving, it fetches the same segment from URL 3, an appliance at an exchange point, and reports the
// failures; the control plane is not on this path.
// Working (round numbers chosen to size the system): two 2 s timeouts against a 30 s buffer leave 26 s to spare;
// 4 s segments, so segment 212 is minute 14 (212 × 4 = 848 s).
// Layout: five lanes. Colours (PATTERN_TONE, section tones only): the device orange (traffic), the playback service
// teal (compute), steering green (the pattern), both appliances neutral (infra); the dead appliance's call is the red
// timeout arrow.
// Fact check (2026-11-17): the flow (appliances report health and files, steering returns appliance URLs, the device
// fetches from them) follows the Open Connect Overview (read 2026); the timeouts and ranks are this page's design.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Pressing play, and an appliance failing mid-stream",
  lanes: [
    { id: "dev", label: "Member device", icon: "video", tone: PATTERN_TONE.traffic },
    { id: "play", label: "Playback API", icon: "server", tone: PATTERN_TONE.compute },
    { id: "steer", label: "Steering", icon: "router", tone: PATTERN_TONE.pattern },
    { id: "isp", label: "ISP appliance", icon: "appliance", tone: PATTERN_TONE.infra },
    { id: "ix", label: "IX appliance", icon: "appliance", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "dev", to: "play", label: "start title 81, profile 2", step: 1 },
    { from: "play", to: "steer", label: "files of the ladder, client IP", step: 1 },
    { from: "steer", to: "play", label: "ranked: isp-7, isp-3, ix-2", kind: "return", step: 1 },
    { from: "play", to: "dev", label: "manifest, 3 URLs, licence", kind: "return", step: 1 },
    { from: "dev", to: "isp", label: "segment 1, low rung", step: 1 },
    { from: "isp", to: "dev", label: "200 in 40 ms", kind: "return", step: 1 },
    { from: "dev", to: "isp", label: "segments 2 to 211, climbing", step: 1 },

    { from: "dev", to: "isp", label: "segment 212: no answer in 2 s", kind: "timeout", step: 2 },
    { from: "dev", to: "isp", label: "URL 2, same site: no answer", kind: "timeout", step: 2 },
    { from: "dev", to: "ix", label: "segment 212 from URL 3", step: 2 },
    { from: "ix", to: "dev", label: "200: playback goes on", kind: "return", step: 2 },
    { from: "dev", to: "play", label: "report: isp-7, isp-3 failed", kind: "async", step: 2 },
  ],
  notes: [
    { lane: "play", text: "authorise: plan, licence for the country", step: 1, at: 0.5 },
    { lane: "dev", text: "30 s buffer: the picture keeps moving", step: 2, at: 7.5 },
  ],
  steps: [{ title: "Play: authorise, rank, stream" }, { title: "The appliance fails: next URL" }],
};

export default spec;
