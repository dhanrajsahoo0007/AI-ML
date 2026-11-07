import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { featuresSchema } from "../features/sections/schema";
import { isPathVisible, resolveAppEnv } from "../features/sections/registry";

// Switches that are not sections, read from content/features.yaml with a state per environment
// (sections and their release states live in content/sections.yaml). Build-time module: also read by
// next.config.ts, so relative imports only.

const FILE = path.join(process.cwd(), "content", "features.yaml");

function loadFeatures(): Record<string, boolean> {
  // Inlined at build by next.config.ts (no filesystem on Workers); scripts and tests outside Next read the file.
  const text = process.env.FEATURES_YAML || fs.readFileSync(FILE, "utf8");
  const result = featuresSchema.safeParse(yaml.load(text));
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${FILE} [${i.path.join(".")}]: ${i.message}`);
    throw new Error(`Invalid feature switches:\n${lines.join("\n")}`);
  }
  const env = resolveAppEnv();
  return Object.fromEntries(Object.entries(result.data).map(([name, states]) => [name, states[env] === "on"]));
}

/** Each switch's value in the current environment, e.g. `features.mlInterviews`. */
export const features: Readonly<Record<string, boolean>> = loadFeatures();

export type FeatureFlag = string;

export function isFeatureOn(flag: FeatureFlag): boolean {
  return features[flag] === true;
}

/**
 * @deprecated Section switches moved to content/sections.yaml; use isPathVisible from
 * features/sections/registry. Kept only for src/app/api/markdown, which stream B deletes; remove
 * this alias once that route is gone.
 */
export const isPathEnabled = isPathVisible;
