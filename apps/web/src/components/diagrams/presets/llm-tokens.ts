// The running example of "Tokenization": train BPE on the tiny corpus "low", "lower", "newest" (each word once, no
// end-of-word marker), then use the learned merge list to encode words the trainer never saw. The page's new figures
// read every number from here: `animated/transformer/bpe-encode` (applying the merges) and
// `animated/transformer/utf8-bytes` (the byte-level base vocabulary). The training figure,
// `animated/transformer/bpe-merges`, runs its own copy of the same trainer and reaches the same three merges.
//
// Training (Sennrich et al. 2016, arXiv 1508.07909, §3.2, Algorithm 1; tie goes to the pair seen first):
//   start    l o w | l o w e r | n e w e s t        l+o 2, o+w 2, w+e 2, the other five pairs 1 → l + o
//   merge 1  lo w | lo w e r | n e w e s t          lo+w 2, w+e 2, the rest 1                  → lo + w
//   merge 2  low | low e r | n e w e s t            every pair once, low+e seen first          → low + e
//   merge 3  low | lowe r | n e w e s t
// Vocabulary, in the order it was built (the id of a token is its index):
//   l 0, o 1, w 2, e 3, r 4, n 5, s 6, t 7, lo 8, low 9, lowe 10   (8 characters + 3 merges = 11; §3.2: "the final
//   symbol vocabulary size is equal to the size of the initial vocabulary, plus the number of merge operations").
//
// Encoding (§3.2: "At test time, we first split words into sequences of characters, then apply the learned
// operations"; merges are applied in the order they were learned):
//   lowest   l o w e s t → lo w e s t → low e s t → lowe s t     6 characters → 3 tokens, ids 10 6 7
//   newer    n e w e r   → no merge applies                       5 characters → 5 tokens, ids 5 3 2 3 4
//   slowly   s l o w l y → s lo w l y → s low l y → (no low+e)    6 characters → 4 tokens, ids 6 9 0 and "y" has
//            no id: it never occurred in training, so a character-level tokenizer emits <unk> (Sennrich §3.2,
//            footnote 3: "The only symbols that will be unknown at test time are unknown characters").
// "lowest" ends up as lowe + s + t, not the linguist's low + est: BPE follows frequency in its corpus, not morphology.
//
// WordPiece on the same first count (score = count(xy) / (count(x) · count(y)), the usual way the likelihood gain of
// Schuster & Nakajima 2012 / Wu et al. 2016 §4.1 is computed in practice). Character counts: l 2, o 2, w 3, e 3, r 1,
// n 1, s 1, t 1.
//   l+o 2/(2·2) = 0.50   o+w 2/(2·3) = 0.33   w+e 2/(3·3) = 0.22   e+r 1/(3·1) = 0.33
//   n+e 1/(1·3) = 0.33   e+w 1/(3·3) = 0.11   e+s 1/(3·1) = 0.33   s+t 1/(1·1) = 1.00
// So BPE merges l + o first (highest count, 2) while WordPiece merges s + t first (score 1.00): s and t only ever
// occur together, which matters more to the likelihood than raw frequency.
//
// Bytes (UTF-8, RFC 3629: U+0000–007F one byte, U+0080–07FF two, U+0800–FFFF three, above that four). "tea" in six
// writings, computed with TextEncoder below:
//   tea  74 65 61 (3)   Tee  54 65 65 (3)   чай  D1 87 D0 B0 D0 B9 (6)   चाय  E0 A4 9A E0 A4 BE E0 A4 AF (9)
//   茶   E8 8C B6 (3)    🍵   F0 9F 8D B5 (4)
// A byte-level tokenizer (GPT-2, Radford et al. 2019 §2.2: "a byte-level version of BPE only requires a base
// vocabulary of size 256") starts from one token per byte, so these are the token counts before any merge; merges
// learned from the training data then shrink the strings that data contained often.
//
// Digit chunks quoted on the page (no figure): cl100k_base, o200k_base (tiktoken_ext/openai_public.py) and Llama 3
// (meta-llama/llama3 llama/tokenizer.py) pre-tokenize numbers with the regex \p{N}{1,3}, which takes up to three digits
// at a time from the left: "1234" → "123" + "4", "12345" → "123" + "45", so the units digit sits in a different chunk
// position for each length. Llama 1 and 2 (arXiv 2302.13971 §2, 2307.09288 §2.2) and Gemma (2403.08295) split every
// digit.

const CORPUS = ["low", "lower", "newest"] as const;
const MERGE_COUNT = 3;
/** The words the page encodes with the learned merges; none of them is in the training corpus. */
const NEW_WORDS = ["lowest", "newer", "slowly"] as const;

type Pair = { a: string; b: string; count: number };

/** Every adjacent pair in the corpus with its count, in order of first appearance. */
function countPairs(words: readonly (readonly string[])[]): Pair[] {
  const seen = new Map<string, Pair>();
  for (const w of words)
    for (let i = 0; i + 1 < w.length; i++) {
      const key = `${w[i]}\u0000${w[i + 1]}`;
      const p = seen.get(key);
      if (p) p.count += 1;
      else seen.set(key, { a: w[i], b: w[i + 1], count: 1 });
    }
  return [...seen.values()];
}

/** The most frequent pair; on a tie, the first one seen. */
const best = (pairs: Pair[]) => pairs.reduce((top, p) => (p.count > top.count ? p : top));

/** Replaces every adjacent a, b in one word with the merged symbol ab. */
function mergeWord(w: readonly string[], a: string, b: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < w.length; i++) {
    if (i + 1 < w.length && w[i] === a && w[i + 1] === b) {
      out.push(a + b);
      i += 1;
    } else out.push(w[i]);
  }
  return out;
}

/** Trains BPE on the corpus: the ordered merge list and the vocabulary in the order it was built. */
function trainBpe(corpus: readonly string[], merges: number) {
  let words = corpus.map((w) => [...w]);
  const list: { a: string; b: string; count: number }[] = [];
  for (let r = 0; r < merges; r++) {
    const m = best(countPairs(words));
    list.push(m);
    words = words.map((w) => mergeWord(w, m.a, m.b));
  }
  const base = [...new Set(corpus.join(""))];
  return { merges: list, vocab: [...base, ...list.map((m) => m.a + m.b)], baseSize: base.length };
}

export const BPE = trainBpe(CORPUS, MERGE_COUNT);

/** Id of a token in the trained vocabulary, or undefined when the tokenizer has never seen it. */
const idOf = (tok: string): number | undefined => {
  const i = BPE.vocab.indexOf(tok);
  return i < 0 ? undefined : i;
};

/** Encodes one word: its symbols at the start and after each merge of the list, applied in learned order. */
function encodeSteps(word: string): string[][] {
  const steps = [[...word]];
  for (const m of BPE.merges) steps.push(mergeWord(steps[steps.length - 1], m.a, m.b));
  return steps;
}

export const ENCODED = NEW_WORDS.map((word) => {
  const steps = encodeSteps(word);
  const tokens = steps[steps.length - 1];
  return { word, steps, tokens, ids: tokens.map(idOf) };
});

/** WordPiece's score for every pair of the first count: count(xy) / (count(x) · count(y)). */
export const WORDPIECE_FIRST = (() => {
  const words = CORPUS.map((w) => [...w]);
  const chars = new Map<string, number>();
  for (const w of words) for (const c of w) chars.set(c, (chars.get(c) ?? 0) + 1);
  return countPairs(words).map((p) => ({ ...p, score: p.count / (chars.get(p.a)! * chars.get(p.b)!) }));
})();

/** "Tea" in six writings, with every character's UTF-8 bytes. */
export const TEA = [
  { lang: "English", text: "tea" },
  { lang: "German", text: "Tee" },
  { lang: "Russian", text: "чай" },
  { lang: "Hindi", text: "चाय" },
  { lang: "Chinese", text: "茶" },
  { lang: "Emoji", text: "🍵" },
].map(({ lang, text }) => {
  const enc = new TextEncoder();
  const chars = [...text].map((ch) => ({
    ch,
    code: `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
    bytes: [...enc.encode(ch)].map((b) => b.toString(16).toUpperCase().padStart(2, "0")),
  }));
  return { lang, text, chars, byteCount: chars.reduce((n, c) => n + c.bytes.length, 0) };
});
