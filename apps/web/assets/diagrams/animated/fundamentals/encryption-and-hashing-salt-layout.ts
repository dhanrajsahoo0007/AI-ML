import type { LayoutSpec } from "@/components/diagrams/types";

// Two StitchBox customers, Ana and Ben, both pick the password "sunflower1".
// Step 1: plain SHA-256. Both rows store the same hash (ddfa5feb... is the real SHA-256 of "sunflower1"),
//         so one precomputed lookup cracks both and the match itself leaks that they share a password.
// Step 2: a random salt per user, then a slow hash (Argon2id). Same password, different stored hashes.
//         The salt and hash values in steps 2 and 3 are shortened and illustrative.
// Step 3: what the database row actually holds: one string with the algorithm, its cost settings, the salt and the hash.
//
// Layout (top-left x, y, w x h):
//   g-fast 20,36 860x140:  ana 40,70 180x40 | ben 40,120 180x40 | h-ana 420,70 200x40 | h-ben 420,120 200x40
//   g-salt 20,196 860x130: ana2 40,230 180x40 | salt-a 232,230 90x40 | s-ana 420,230 200x40
//                          ben2 40,276 180x40 | salt-b 232,276 90x40 | s-ben 420,276 200x40
//   g-row 20,346 860x96:   r-alg 40,380 120x44 | r-cost 166,380 190x44 | r-salt 362,380 150x44 | r-hash 518,380 200x44
// Rows are 6 to 10 px apart; columns at least 12 px apart.
const spec: LayoutSpec = {
  kind: "layout",
  title: "Why passwords get a salt and a slow hash",
  width: 900,
  height: 450,
  steps: [
    { title: "Plain hash: same password, same hash" },
    { title: "Salt plus a slow hash: different hashes" },
    { title: "What the database stores" },
  ],
  groups: [
    { id: "g-fast", title: "Plain SHA-256, no salt", tone: "red", x: 20, y: 36, w: 860, h: 140 },
    { id: "g-salt", title: "Random salt, then Argon2id", tone: "green", x: 20, y: 196, w: 860, h: 130 },
    { id: "g-row", title: "One stored string per user", tone: "violet", x: 20, y: 346, w: 860, h: 96 },
  ],
  shapes: [
    // Step 1: no salt, fast hash.
    { id: "ana", type: "box", x: 40, y: 70, w: 180, h: 40, label: "Ana: sunflower1", tone: "neutral" },
    { id: "ben", type: "box", x: 40, y: 120, w: 180, h: 40, label: "Ben: sunflower1", tone: "neutral" },
    { id: "h-ana", type: "box", x: 420, y: 70, w: 200, h: 40, label: "ddfa5feb…", tone: "red", highlight: true },
    { id: "h-ben", type: "box", x: 420, y: 120, w: 200, h: 40, label: "ddfa5feb…", tone: "red", highlight: true },
    { id: "f1", type: "arrow", x: 0, y: 0, from: "ana", to: "h-ana", label: "SHA-256", tone: "red" },
    { id: "f2", type: "arrow", x: 0, y: 0, from: "ben", to: "h-ben", label: "SHA-256", tone: "red" },
    { id: "fast-note1", type: "text", x: 640, y: 80, w: 230, h: 20, label: "Identical rows leak a match", tone: "red" },
    { id: "fast-note2", type: "text", x: 640, y: 130, w: 230, h: 20, label: "One lookup cracks both", tone: "red" },

    // Step 2: a different random salt per user, then a deliberately slow hash.
    { id: "ana2", type: "box", x: 40, y: 230, w: 180, h: 40, label: "Ana: sunflower1", tone: "neutral", step: 2 },
    { id: "salt-a", type: "cell", x: 232, y: 230, w: 90, h: 40, label: "+ q7Z1…", sub: "salt", tone: "green", step: 2 },
    { id: "s-ana", type: "box", x: 420, y: 230, w: 200, h: 40, label: "91bd04e7…", tone: "green", step: 2 },
    { id: "ben2", type: "box", x: 40, y: 276, w: 180, h: 40, label: "Ben: sunflower1", tone: "neutral", step: 2 },
    { id: "salt-b", type: "cell", x: 232, y: 276, w: 90, h: 40, label: "+ M4kx…", sub: "salt", tone: "green", step: 2 },
    { id: "s-ben", type: "box", x: 420, y: 276, w: 200, h: 40, label: "2c6f7a13…", tone: "green", step: 2 },
    { id: "a1", type: "arrow", x: 0, y: 0, from: "salt-a", to: "s-ana", label: "Argon2id", tone: "green", step: 2 },
    { id: "a2", type: "arrow", x: 0, y: 0, from: "salt-b", to: "s-ben", label: "Argon2id", tone: "green", step: 2 },
    {
      id: "salt-note1",
      type: "text",
      x: 640,
      y: 240,
      w: 230,
      h: 20,
      label: "Different salts, different hashes",
      tone: "green",
      step: 2,
    },
    {
      id: "salt-note2",
      type: "text",
      x: 640,
      y: 286,
      w: 230,
      h: 20,
      label: "Each guess costs 19 MiB of memory",
      tone: "green",
      step: 2,
    },

    // Step 3: the stored value carries everything needed to check a login later.
    {
      id: "r-alg",
      type: "cell",
      x: 40,
      y: 380,
      w: 120,
      h: 44,
      label: "argon2id",
      sub: "algorithm",
      tone: "violet",
      step: 3,
    },
    {
      id: "r-cost",
      type: "cell",
      x: 166,
      y: 380,
      w: 190,
      h: 44,
      label: "m=19456,t=2,p=1",
      sub: "cost settings",
      tone: "violet",
      step: 3,
    },
    {
      id: "r-salt",
      type: "cell",
      x: 362,
      y: 380,
      w: 150,
      h: 44,
      label: "q7Z1…",
      sub: "salt, 16 bytes",
      tone: "green",
      step: 3,
      highlight: true,
    },
    {
      id: "r-hash",
      type: "cell",
      x: 518,
      y: 380,
      w: 200,
      h: 44,
      label: "91bd04e7…",
      sub: "hash, 32 bytes",
      tone: "violet",
      step: 3,
    },
    { id: "row-note", type: "text", x: 728, y: 392, w: 140, h: 20, label: "No key needed", tone: "violet", step: 3 },
  ],
};

export default spec;
