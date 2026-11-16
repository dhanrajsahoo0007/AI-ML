// The running example of "Encoder, decoder and encoder-decoder models": BERT's sentence pair from
// `animated/transformer/bert-pretrain-finetune`, "the kettle boiled" / "she poured the tea", with "boiled" and "tea"
// as the two hidden words. The page's new figures (`mlm-masking-rule`, `objectives-compared`) read their tokens and
// counts from here, and the prose quotes the losses and head sizes below. `bert-pretrain-finetune` keeps its own copy
// of the tokens and logits (it predates this module); MLM_PRED and NSP_PRED here repeat its logits and must give the
// same shown probabilities (0.54, 0.63, 0.97).
//
// Masked language model (Devlin et al. 2018, arXiv 1810.04805 §3.1): 15 % of WordPiece positions are chosen; a chosen
// token becomes [MASK] 80 % of the time, a random token 10 %, stays unchanged 10 %; cross-entropy only at the chosen
// positions. §A.1: random replacement touches 10 % of 15 % = 1.5 % of all tokens; §C.1: "only 15 % of words are
// predicted in each batch rather than every word". Per 1,000 training tokens:
//   chosen     1,000 × 0.15 = 150   → [MASK] 150 × 0.8 = 120, random 150 × 0.1 = 15, unchanged 15
//   no loss    1,000 − 150  = 850
//   a causal LM (GPT, Radford et al. 2018 §3.1) has a next-token target at every position: 1,000, 1,000 / 150 ≈ 6.7×
//   (ELECTRA, Clark et al. 2020, arXiv 2003.10555 §1: MLM "only learns from 15 % of the tokens per example").
//
// Span corruption (Raffel et al. 2019, arXiv 1910.10683 §3.1.4 and §3.3.4): drop 15 % of tokens, replace each
// consecutive span with one sentinel unique in the sequence; the target is the dropped spans, each after its sentinel,
// plus one final sentinel. With the paper's mean span length of 3 (§3.3.4: "500 × 0.15 = 75 … 75/25 = 3"), per 1,000
// tokens: dropped 150 in 150 / 3 = 50 spans → encoder input 1,000 − 150 + 50 = 900, decoder target 150 + 50 + 1 = 201.
//
// On the running example (7 words, punctuation left out; the rate is illustrative, 2 of 7 words, so the effect shows):
//   BERT input   [CLS] the kettle [MASK] [SEP] she poured the [MASK] [SEP]   10 positions, 2 targets: boiled, tea
//   GPT          <s> the kettle boiled she poured the → the kettle boiled she poured the tea   7 targets of 7
//   T5 encoder   the kettle <X> she poured the <Y>                                              7 tokens
//   T5 decoder   <X> boiled <Y> tea <Z>                                                         5 tokens, 2 words
//
// Losses on the bert-pretrain-finetune step (cross-entropy = −ln p of the right answer; §A.2: "the training loss is
// the sum of the mean masked LM likelihood and the mean next sentence prediction likelihood"):
//   boiled  p = 0.544 → −ln 0.544 = 0.610     tea  p = 0.634 → −ln 0.634 = 0.456     mean MLM 0.533
//   NSP     p(IsNext) = 0.968 → 0.033         total 0.533 + 0.033 = 0.566
//
// Fine-tuning head (§4.1: "The only new parameters introduced during fine-tuning are classification layer weights
// W ∈ R^(K×H)"): K = 2 labels, H = 768 (BERT-base, §3) → 2 × 768 = 1,536 weights, + 2 biases = 1,538, which is
// 1,538 / 110,000,000 ≈ 0.0014 % of BERT-base's 110M. SQuAD (§4.2) adds a start and an end vector S, E ∈ R^H: also
// 2 × 768 = 1,536.
//
// Embedding tables of BERT-base (§3: 30,000-token WordPiece vocabulary, H = 768; §A.2: positions learned up to 512):
//   token     30,000 × 768 = 23,040,000 (≈ 21 % of 110M)     position  512 × 768 = 393,216     segment  2 × 768 = 1,536
// The position table has 512 rows, so a 513th token has no position vector: inputs are cut or split at 512.

/** One position of the BERT input; `hidden` is the word behind [MASK] there. */
interface PairToken {
  t: string;
  hidden?: string;
}

/** The pre-training pair, exactly as `bert-pretrain-finetune` draws it. */
export const PAIR: PairToken[] = [
  { t: "[CLS]" },
  { t: "the" },
  { t: "kettle" },
  { t: "boiled", hidden: "boiled" },
  { t: "[SEP]" },
  { t: "she" },
  { t: "poured" },
  { t: "the" },
  { t: "tea", hidden: "tea" },
  { t: "[SEP]" },
];

/** The same text as plain words, for the decoder-only and encoder-decoder objectives. */
const WORDS = PAIR.filter((p) => !p.t.startsWith("[")).map((p) => p.t);

// ── Per 1,000 training tokens ────────────────────────────────────────────────────────────────────────────────────
const PER = 1_000;
const MLM_RATE = 0.15;
const T5_MEAN_SPAN = 3;

export const BUDGET = {
  per: PER,
  mlmChosen: PER * MLM_RATE,
  mlmMask: PER * MLM_RATE * 0.8,
  mlmRandom: PER * MLM_RATE * 0.1,
  mlmKept: PER * MLM_RATE * 0.1,
  mlmNoLoss: PER - PER * MLM_RATE,
  causalTargets: PER,
  t5Dropped: PER * MLM_RATE,
  t5Spans: (PER * MLM_RATE) / T5_MEAN_SPAN,
  t5Input: PER - PER * MLM_RATE + (PER * MLM_RATE) / T5_MEAN_SPAN,
  t5Target: PER * MLM_RATE + (PER * MLM_RATE) / T5_MEAN_SPAN + 1,
};

// ── The three objectives on the running example ──────────────────────────────────────────────────────────────────
const SENTINELS = ["<X>", "<Y>", "<Z>"];

/** Span corruption of WORDS: each run of hidden words becomes one sentinel; the target lists the runs. */
function spanCorrupt(words: string[], hidden: Set<string>) {
  const input: string[] = [];
  const target: string[] = [];
  let s = 0;
  for (let i = 0; i < words.length; i++) {
    if (!hidden.has(words[i])) {
      input.push(words[i]);
      continue;
    }
    input.push(SENTINELS[s]);
    target.push(SENTINELS[s]);
    s += 1;
    while (i < words.length && hidden.has(words[i])) target.push(words[i++]);
    i -= 1;
  }
  target.push(SENTINELS[s]);
  return { input, target };
}

const HIDDEN = new Set(PAIR.flatMap((p) => (p.hidden ? [p.hidden] : [])));

export const OBJECTIVES = {
  mlmInput: PAIR.map((p) => (p.hidden ? "[MASK]" : p.t)),
  mlmTargets: PAIR.map((p) => p.hidden ?? null),
  causalInput: ["<s>", ...WORDS.slice(0, -1)],
  causalTargets: WORDS,
  t5: spanCorrupt(WORDS, HIDDEN),
};

// ── Losses on the bert-pretrain-finetune example (logits repeated from that spec) ───────────────────────────────
const softmaxFirst = (z: number[], rest?: number) => {
  const total = z.reduce((a, b) => a + Math.exp(b), 0) + (rest === undefined ? 0 : Math.exp(rest));
  return Math.exp(z[0]) / total;
};

const P_BOILED = softmaxFirst([5.2, 4.1, 2.9], 4.3);
const P_TEA = softmaxFirst([5.5, 4.2, 3.0], 4.0);
const P_ISNEXT = softmaxFirst([2.4, -1.0]);

export const LOSS = {
  pBoiled: P_BOILED,
  pTea: P_TEA,
  pIsNext: P_ISNEXT,
  boiled: -Math.log(P_BOILED),
  tea: -Math.log(P_TEA),
  mlmMean: (-Math.log(P_BOILED) - Math.log(P_TEA)) / 2,
  nsp: -Math.log(P_ISNEXT),
  total: (-Math.log(P_BOILED) - Math.log(P_TEA)) / 2 - Math.log(P_ISNEXT),
};

// ── Fine-tuning head size ────────────────────────────────────────────────────────────────────────────────────────
const H = 768;
const BERT_BASE_PARAMS = 110_000_000;

export const HEAD = {
  weights: 2 * H,
  withBias: 2 * H + 2,
  shareOfBase: (2 * H + 2) / BERT_BASE_PARAMS,
  squadVectors: 2 * H,
};

// ── Embedding tables ─────────────────────────────────────────────────────────────────────────────────────────────
const VOCAB = 30_000;
const MAX_POS = 512;

export const TABLES = {
  token: VOCAB * H,
  tokenShare: (VOCAB * H) / BERT_BASE_PARAMS,
  position: MAX_POS * H,
  segment: 2 * H,
  maxPositions: MAX_POS,
};
