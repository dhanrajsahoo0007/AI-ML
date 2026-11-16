import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One suggestion request merged from two layers (typeahead, Step 7 and Deep dive 2).
// Two steps: 1 the merge: the suggest service asks the trie index for the top 10 of "ele" and the trending layer for
// its list, in parallel; it scores both on one scale (searches an hour), drops what the blocklist names and returns
// five · 2 the trending layer does not answer within its 10 ms deadline: the service returns the base list alone,
// inside the budget, instead of waiting.
// Working (round numbers): "electric car" 216,000 searches in 30 days ÷ 720 hours = 300 an hour. "election results"
// 7,200 in 30 days = 10 an hour in the base index, but 900 in the last 10 minutes × 6 = 5,400 an hour in the
// trending layer, so it ranks first. Ten base candidates plus one trending = 11 checked; one is blocked; five return.
// Layout: five lanes. Colours (PATTERN_TONE): the browser orange (traffic), the suggest service teal (compute), the
// trie index and the trending layer violet (stores), the blocklist lime (a check); the missed deadline is the red
// timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Merging the base index and the trending layer",
  lanes: [
    { id: "browser", label: "Browser", icon: "browser", tone: PATTERN_TONE.traffic },
    { id: "svc", label: "Suggest service", icon: "api", tone: PATTERN_TONE.compute },
    { id: "index", label: "Trie index", icon: "trie", tone: PATTERN_TONE.store },
    { id: "trend", label: "Trending layer", icon: "cache", tone: PATTERN_TONE.store },
    { id: "block", label: "Blocklist", icon: "shield", tone: PATTERN_TONE.check },
  ],
  messages: [
    { from: "browser", to: "svc", label: "GET /suggest?q=ele", step: 1 },
    { from: "svc", to: "index", label: "top 10 for “ele”", step: 1 },
    { from: "svc", to: "trend", label: "trending for “ele”", step: 1 },
    { from: "index", to: "svc", label: "electric car 300/h …", kind: "return", step: 1 },
    { from: "trend", to: "svc", label: "election results 5,400/h", kind: "return", step: 1 },
    { from: "svc", to: "block", label: "check 11 candidates", step: 1 },
    { from: "block", to: "svc", label: "drop 1", kind: "return", step: 1 },
    { from: "svc", to: "browser", label: "top 5, trending first", kind: "return", step: 1 },

    { from: "browser", to: "svc", label: "GET /suggest?q=elec", step: 2 },
    { from: "svc", to: "index", label: "top 10 for “elec”", step: 2 },
    { from: "svc", to: "trend", label: "no answer in 10 ms", kind: "timeout", step: 2 },
    { from: "index", to: "svc", label: "electric car 300/h …", kind: "return", step: 2 },
    { from: "svc", to: "block", label: "check 10 candidates", step: 2 },
    { from: "svc", to: "browser", label: "top 5 from the base", kind: "return", step: 2 },
  ],
  steps: [{ title: "Merge two layers, filter, keep five" }, { title: "The trending layer is slow: skip it" }],
};

export default spec;
