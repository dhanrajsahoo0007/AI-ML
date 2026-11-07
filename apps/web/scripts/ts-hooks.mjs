// Lets plain Node (22.18+, which strips TypeScript types natively) run the build-time TypeScript
// under scripts/ and the unit tests, without a TS runner dependency:
//   node --import ./scripts/ts-hooks.mjs scripts/content-check.ts
// It resolves extensionless relative imports and the `@/` alias to .ts files, and stubs
// `server-only` (which only exists to stop client bundles importing server modules).
import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

function findFile(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of EXTENSIONS) if (existsSync(base + ext)) return base + ext;
  for (const ext of EXTENSIONS) {
    const index = path.join(base, `index${ext}`);
    if (existsSync(index)) return index;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export {};", shortCircuit: true };
    }
    let base = null;
    if (specifier.startsWith("@/")) base = path.join(SRC, specifier.slice(2));
    else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (base) {
      const file = findFile(base);
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  // The repo's TypeScript is ESM; say so, instead of letting Node guess per file (and warn).
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".ts"))
      return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  },
});
