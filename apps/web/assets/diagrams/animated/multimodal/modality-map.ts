import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { MODALITY_TONE as M, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { PROMPT } from "@/components/diagrams/presets/rag";
import { VLM } from "@/components/diagrams/presets/production-multimodal";
import { WHISPER } from "@/components/diagrams/presets/production-speech";
import { blockBox, link, note } from "@/components/diagrams/presets/production-finetune";

// "Every modality becomes vectors in one sequence" on the Multimodal and Voice AI page (hero). The four things a
// Brightpost customer can send, each through its own encoder, each ending as a run of tokens the language model reads
// together.
//   text:  the 15-token question (PROMPT.questionTokens, presets/rag.ts).
//   image: LLaVA-1.5 (Liu et al. 2023): CLIP ViT-L/14 at 336 px, 336 ÷ 14 = 24 patches a side, 24 × 24 = 576 tokens
//          (VLM.tokens, presets/production-multimodal.ts).
//   audio: Whisper's encoder: a 30 s window, 3,000 frames of 10 ms, halved by a stride-2 convolution = 1,500
//          positions (WHISPER.positions, presets/production-speech.ts). A speech LLM may use another front end.
//   video: a 10 s clip sampled at 1 frame a second (illustrative), each frame treated as one 576-token image:
//          10 × 576 = 5,760 tokens (illustrative; real systems compress frames).
// No steps. Canvas 860 x 410. Columns: inputs x 14 (w 150), encoders x 214 (w 170), token boxes x 430 (w 200) inside
// the group "one token sequence" (x 415, w 230), the language model x 700 (w 130, h 150). Rows (y): 40, 130, 220, 310,
// h 56 (pitch 90).
// Colours (MODALITY_TONE): text orange, image and video blue, audio violet, the model green; encoders and the group neutral.

const ROWS = [
  {
    id: "text",
    tone: M.text,
    input: ["Question", "“Where is my refund?”"],
    enc: ["Tokenizer", "words → ids → vectors"],
    tok: [`${PROMPT.questionTokens} tokens`, "one per word piece"],
  },
  {
    id: "image",
    tone: M.image,
    input: ["Photo", "the cracked kettle"],
    enc: ["Vision encoder", "patches → vectors"],
    tok: [`${n(VLM.tokens)} tokens`, `${VLM.perSide} × ${VLM.perSide} patches`],
  },
  {
    id: "audio",
    tone: M.audio,
    input: ["Voice", "the phone call"],
    enc: ["Audio encoder", "spectrogram → vectors"],
    tok: [`${n(WHISPER.positions)} positions`, `${WHISPER.windowSec} s window (Whisper)`],
  },
  {
    id: "video",
    tone: M.image,
    input: ["Clip", "unboxing, 10 s"],
    enc: ["Frame encoder", "frames → vectors"],
    tok: [`${n(10 * VLM.tokens)} tokens`, `10 frames × ${VLM.tokens}, illustrative`],
  },
] as const;

const Y = (i: number) => 40 + i * 90;
const shapes: LayoutShape[] = [
  ...ROWS.flatMap((r, i) => [
    blockBox(`in-${r.id}`, 14, Y(i), 150, 56, r.input[0], r.tone, { sub: r.input[1] }),
    blockBox(`enc-${r.id}`, 214, Y(i), 170, 56, r.enc[0], PROD_TONE.infra, { sub: r.enc[1] }),
    blockBox(`tok-${r.id}`, 430, Y(i), 200, 56, r.tok[0], r.tone, { sub: r.tok[1] }),
    link(`a1-${r.id}`, `in-${r.id}`, `enc-${r.id}`),
    link(`a2-${r.id}`, `enc-${r.id}`, `tok-${r.id}`),
    link(`a3-${r.id}`, `tok-${r.id}`, "llm"),
  ]),
  blockBox("llm", 700, 127, 130, 150, "Language model", M.model, { sub: "reads one sequence" }),
  note(
    "n-foot",
    14,
    378,
    832,
    "After the encoders every input is a row of vectors the same width as a word's. The model attends over all of them.",
    {}
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Text, image, audio and video all become tokens in one sequence",
  width: 860,
  height: 410,
  groups: [{ id: "g-seq", title: "one token sequence", tone: PROD_TONE.infra, x: 415, y: 16, w: 230, h: 350 }],
  shapes,
};

export default spec;
