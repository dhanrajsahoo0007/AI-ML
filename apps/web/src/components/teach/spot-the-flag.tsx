import * as React from "react";
import type { z } from "zod";
import { SpotTheFlagClient } from "./lazy.client";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";
import { spotTheFlagSchema } from "./spot-the-flag-model";

// Server wrapper: validates the answer from MDX, then hands it to the island. Usage in MDX:
//   <SpotTheFlag
//     prompt="Tell me about a time you disagreed with a teammate."
//     sentences={[
//       { text: "We had a legacy monolith from 2019.", flag: "Backstory. It earns no points." },
//       { text: "I ran a benchmark of both designs.", note: "A first-person action." },
//       { text: "In the end we agreed." },
//     ]}
//   />
export function SpotTheFlag(props: z.input<typeof spotTheFlagSchema>) {
  const parsed = parseProps("SpotTheFlag", spotTheFlagSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  return <SpotTheFlagClient {...parsed.data} />;
}
