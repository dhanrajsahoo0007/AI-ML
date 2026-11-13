import * as React from "react";
import type { z } from "zod";
import { ChoiceDrillClient } from "./lazy.client";
import { guessTheLevelSchema, levelDrill, principleDrill, whichPrincipleSchema } from "./choice-drill-model";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// Server wrappers for the two pick-one exercises. Each validates its props from MDX and hands the shared island
// a list of items answered from one set of options. Usage in MDX:
//   <GuessTheLevel
//     prompt="Tell me about a time you improved something."
//     levels={["Mid", "Senior", "Staff"]}
//     answers={[{ text: "I moved four teams to one client library.", level: "Staff", why: "Four teams changed." }]}
//   />
//   <WhichPrinciple
//     principles={["Ownership", "Dive Deep"]}
//     prompts={[
//       { text: "Tell me about a problem outside your area.", principle: "Ownership", why: "It was not your job." },
//       { text: "Tell me about a metric that misled you.", principle: "Dive Deep", why: "You checked the raw data." },
//     ]}
//   />

export function GuessTheLevel(props: z.input<typeof guessTheLevelSchema>) {
  const parsed = parseProps("GuessTheLevel", guessTheLevelSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  return <ChoiceDrillClient {...levelDrill(parsed.data)} />;
}

export function WhichPrinciple(props: z.input<typeof whichPrincipleSchema>) {
  const parsed = parseProps("WhichPrinciple", whichPrincipleSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  return <ChoiceDrillClient {...principleDrill(parsed.data)} />;
}
