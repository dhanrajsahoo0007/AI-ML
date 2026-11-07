// The unit tests here run under plain Node (`node --import ./scripts/ts-hooks.mjs --test …`) and
// under Vitest once it is set up: both provide describe/it, and the tests assert with node:assert.
const runner = process.env.VITEST ? "vitest" : "node:test";
export const { describe, it } = (await import(runner)) as typeof import("node:test");
