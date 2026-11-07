import fs from "node:fs";
import path from "node:path";

/** apps/web/wrangler.jsonc as JSON (comments outside strings and trailing commas dropped), for config tests. */
export function readWranglerConfig(): Record<string, unknown> {
  const src = fs.readFileSync(path.join(__dirname, "../../wrangler.jsonc"), "utf8");
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (c === '"') {
      let j = i + 1;
      while (src[j] !== '"') j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j;
    } else if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
    } else out += c;
  }
  return JSON.parse(out.replace(/,(\s*[\]}])/g, "$1")) as Record<string, unknown>;
}
