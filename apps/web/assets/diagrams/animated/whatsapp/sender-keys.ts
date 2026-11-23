import type { LayoutGroup, LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Groups: pairwise encryption against sender keys (whatsapp, Step 5 and Deep dive 1).
// Two steps: 1 pairwise: Ana's phone encrypts the message once per member device and uploads every copy · 2 sender
// key: Ana's phone sends her sender key to each member device once, over the pairwise sessions (dashed), then each
// message is encrypted once and uploaded once; the server copies that one ciphertext to every device.
// Working: a 256-member group × 1.5 devices per member = 384 devices. Pairwise: 384 encryptions and 384 × 300 B =
// 115,200 B ≈ 115 KB uploaded from the phone per message. Sender key: 1 encryption and 300 B up per message; the
// server's work (384 mailbox entries) is the same in both. The sender key is sent again to 383 devices when a member
// leaves.
// Fact check (2026-11-17, WhatsApp encryption overview, version of 2026-10-30): the sender key is "distributed to each
// member device of the group, using a pairwise encrypted session"; the sender "transmits the single ciphertext
// message to the server, which does server-side fan-out"; when a member leaves, all members clear their sender key.
// Layout: two panels (groups) 400 wide, side by side. In each: Ana's phone (150 × 48) at y 60, the uploaded
// ciphertexts at y 140, the server at y 220, the member devices at y 310 (five cells, the fourth "…"), the sum at y
// 372. Colours (PATTERN_TONE): phone orange (traffic), ciphertexts blue (data), server and devices neutral
// (plumbing), the sender key and the one ciphertext green (the pattern's own part).

const PW = 400;
const CW = 56;
const GAP = 8;
const ROW = 5 * CW + 4 * GAP;
const shapes: LayoutShape[] = [];
const groups: LayoutGroup[] = [];

function panel(p: "a" | "b", x0: number, step: number) {
  const pairwise = p === "a";
  const cx = (i: number) => x0 + (PW - ROW) / 2 + i * (CW + GAP);
  const names = ["1", "2", "3", "…", "384"];
  groups.push({
    id: `${p}-panel`,
    title: pairwise ? "Pairwise: n encryptions" : "Sender key: one encryption",
    tone: pairwise ? PATTERN_TONE.data : PATTERN_TONE.pattern,
    x: x0,
    y: 20,
    w: PW,
    h: 380,
  });
  shapes.push({
    id: `${p}-phone`,
    type: "box",
    x: x0 + (PW - 170) / 2,
    y: 60,
    w: 170,
    h: 48,
    label: "Ana's phone",
    sub: pairwise ? "encrypts 384 times" : "encrypts once",
    tone: PATTERN_TONE.traffic,
    fill: "pastel",
    step,
  });
  if (pairwise) {
    names.forEach((n, i) =>
      shapes.push({
        id: `${p}-c${i}`,
        type: "cell",
        x: cx(i),
        y: 140,
        w: CW,
        h: 34,
        label: n === "…" ? "…" : `c${n}`,
        tone: PATTERN_TONE.data,
        quiet: i !== 2,
        step,
      })
    );
  } else {
    shapes.push({
      id: `${p}-c2`,
      type: "cell",
      x: x0 + (PW - 150) / 2,
      y: 140,
      w: 150,
      h: 34,
      label: "1 ciphertext",
      tone: PATTERN_TONE.pattern,
      step,
    });
  }
  shapes.push({
    id: `${p}-server`,
    type: "box",
    x: x0 + (PW - 170) / 2,
    y: 220,
    w: 170,
    h: 48,
    label: "Server",
    sub: pairwise ? "forwards 384 copies" : "copies it 384 times",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
    step,
  });
  names.forEach((n, i) =>
    shapes.push({
      id: `${p}-d${i}`,
      type: "cell",
      x: cx(i),
      y: 310,
      w: CW,
      h: 34,
      label: n === "…" ? "…" : `d${n}`,
      tone: PATTERN_TONE.infra,
      quiet: i !== 2,
      step,
    })
  );
  shapes.push({ id: `${p}-up`, type: "arrow", x: 0, y: 0, from: `${p}-phone`, to: `${p}-c2`, step });
  shapes.push({
    id: `${p}-in`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `${p}-c2`,
    to: `${p}-server`,
    label: pairwise ? "115 KB up" : "300 B up",
    step,
  });
  shapes.push({ id: `${p}-out`, type: "arrow", x: 0, y: 0, from: `${p}-server`, to: `${p}-d2`, step });
  shapes.push({
    id: `${p}-sum`,
    type: "text",
    x: x0 + 10,
    y: 362,
    w: PW - 20,
    h: 20,
    label: pairwise ? "384 encryptions, 384 uploads per message" : "1 encryption, 1 upload per message",
    tone: pairwise ? PATTERN_TONE.data : PATTERN_TONE.pattern,
    step,
  });
  if (!pairwise) {
    shapes.push({
      id: `${p}-key`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `${p}-phone`,
      to: `${p}-d4`,
      via: [
        [x0 + PW - 22, 84],
        [x0 + PW - 22, 290],
      ],
      tone: PATTERN_TONE.pattern,
      dashed: true,
      step,
    });
    shapes.push({
      id: `${p}-key-label`,
      type: "text",
      x: x0 + PW - 122,
      y: 178,
      w: 96,
      h: 40,
      label: "sender key:\npairwise, once",
      tone: PATTERN_TONE.pattern,
      step,
    });
  }
}

panel("a", 20, 1);
panel("b", 450, 2);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Pairwise encryption against sender keys for a group",
  width: 870,
  height: 420,
  groups,
  shapes,
  steps: [{ title: "Pairwise: 384 copies from the phone" }, { title: "Sender key: one copy, the server fans out" }],
};

export default spec;
