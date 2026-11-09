"use client";

import { useState, type FormEvent } from "react";
import { cx } from "./cx";
import { bloomBuild, bloomPositions, bloomTest, falsePositiveRate, normalizeWord, optimalK } from "./bloom";
import { formatPercent } from "./format";
import { ActionButton, RangeField, Stat, WidgetFrame } from "./shared.client";

interface BloomFilterSimProps {
  /** Id prefix from the server wrapper: useId inside a next/dynamic island does not match between SSR and hydration. */
  idBase: string;
  title?: string;
  /** Bits in the filter, m (8–64). */
  bits: number;
  /** Hash functions, k (1–6). */
  hashes: number;
  /** Words already added on first render. */
  words: string[];
}

const MAX_WORDS = 20;

// Add words to set bits; test a word to see whether its k bits are all set. Words the filter says "probably"
// for but were never added are false positives.
export function BloomFilterSim({
  idBase,
  title,
  bits: initialBits,
  hashes: initialK,
  words: initialWords,
}: BloomFilterSimProps) {
  const ids = { m: `${idBase}-m`, k: `${idBase}-k`, add: `${idBase}-add`, test: `${idBase}-test` };
  const [m, setM] = useState(initialBits);
  const [k, setK] = useState(initialK);
  const [words, setWords] = useState<string[]>(() => [...new Set(initialWords.map(normalizeWord))]);
  const [draft, setDraft] = useState("");
  const [probe, setProbe] = useState("grape");
  const bits = bloomBuild(words, k, m);
  const probeWord = normalizeWord(probe);
  const probePos = probeWord ? bloomPositions(probeWord, k, m) : [];
  const maybe = bloomTest(bits, probePos);
  const added = words.includes(probeWord);
  const setCount = bits.filter(Boolean).length;

  const add = (e: FormEvent) => {
    e.preventDefault();
    const w = normalizeWord(draft);
    if (w && !words.includes(w) && words.length < MAX_WORDS) setWords([...words, w]);
    setDraft("");
  };

  let verdict: string;
  if (!probeWord) verdict = "Type a word to test.";
  else if (!maybe) verdict = `"${probeWord}": definitely not in the set (a bit is 0).`;
  else if (added) verdict = `"${probeWord}": probably in the set, and it was added.`;
  else verdict = `"${probeWord}": probably in the set, but it was never added. A false positive.`;

  return (
    <WidgetFrame
      label="Bloom filter"
      title={title ?? "Probably yes, definitely no"}
      intro="Adding a word sets k bits. Testing a word checks those k bits: any 0 means it was never added; all 1 means it probably was."
      footer="False-positive rate p ≈ (1 − e^(−kn/m))^k for n words. Bits can't be cleared, so words can't be removed."
    >
      <div className="grid grid-cols-2 gap-4">
        <RangeField id={ids.m} label="Bits (m)" value={m} min={8} max={64} step={8} onChange={setM} />
        <RangeField id={ids.k} label="Hash functions (k)" value={k} min={1} max={6} onChange={setK} />
      </div>

      <div
        className="mt-4 grid grid-cols-8 gap-1 sm:grid-cols-16"
        role="img"
        aria-label={`${setCount} of ${m} bits set`}
      >
        {bits.map((b, i) => {
          const probed = probePos.includes(i);
          return (
            <div
              key={i}
              className={cx(
                "flex aspect-square items-center justify-center rounded text-[10px] tabular-nums",
                b ? "bg-[var(--dg-blue)] text-paper" : "bg-paper-2 text-muted-foreground",
                probed &&
                  (b
                    ? "ring-2 ring-[var(--dg-green)] ring-offset-1 ring-offset-paper"
                    : "ring-2 ring-[var(--dg-red)] ring-offset-1 ring-offset-paper")
              )}
            >
              {i}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <form onSubmit={add}>
          <label htmlFor={ids.add} className="text-sm font-medium text-ink">
            Add a word
          </label>
          <div className="mt-1 flex gap-1.5">
            <input
              id={ids.add}
              value={draft}
              maxLength={24}
              onChange={(e) => setDraft(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-hairline bg-paper px-2 py-1 text-sm text-ink focus-visible:outline-2 focus-visible:outline-ring"
            />
            <button
              type="submit"
              disabled={words.length >= MAX_WORDS}
              className="rounded-md border border-ink bg-ink px-2.5 py-1 text-[13px] font-medium text-paper focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1" aria-label="Words in the filter">
            {words.map((w) => (
              <li key={w} className="rounded-full border border-hairline px-2 py-0.5 text-xs text-ink-2">
                {w}
              </li>
            ))}
          </ul>
          {words.length > 0 && (
            <div className="mt-2">
              <ActionButton onClick={() => setWords([])}>Clear filter</ActionButton>
            </div>
          )}
        </form>

        <div>
          <label htmlFor={ids.test} className="text-sm font-medium text-ink">
            Test a word
          </label>
          <input
            id={ids.test}
            value={probe}
            maxLength={24}
            onChange={(e) => setProbe(e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline bg-paper px-2 py-1 text-sm text-ink focus-visible:outline-2 focus-visible:outline-ring"
          />
          <p className="mt-2 text-sm text-ink" aria-live="polite">
            {verdict}
          </p>
          {probeWord && <p className="mt-1 text-xs text-muted-foreground">Bits checked: {probePos.join(", ")}</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Words (n)" value={words.length} tone="blue" />
        <Stat label="Bits set" value={`${setCount} / ${m}`} tone="violet" />
        <Stat
          label="False positives"
          value={formatPercent(falsePositiveRate(m, k, words.length))}
          hint={`best k here: ${optimalK(m, Math.max(1, words.length))}`}
          tone="orange"
        />
      </div>
    </WidgetFrame>
  );
}
