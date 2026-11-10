// Fails if a tracked file still uses the site's former name or its old technical prefixes. The brand is
// TokensToScale (src/config/business.ts `BRAND`). Run: `npm run check:brand`.
// "origins" as a web term (TRUSTED_ORIGINS, trustedOrigins, CDN origins) is fine and is not matched here.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const SELF = "apps/web/scripts/check-brand.ts";

const BANNED: { pattern: RegExp; why: string }[] = [
  { pattern: /origins[ _-]?ai/i, why: "former brand name" },
  { pattern: /(?<![A-Za-z0-9_])_{0,2}oa_[a-z]/, why: "former `oa_` prefix (use `tts_`)" },
  { pattern: /origins(ai)?\.(test|example)/i, why: "former test domain (use tokenstoscale.test / .example)" },
  { pattern: /postgres:\/\/origins|origins_(dev|e2e)|-U origins/, why: "former local database names (use tts)" },
  { pattern: /origins\/(api-route-wrapper|no-server-only-in-client)/, why: "former lint plugin name (use tts/)" },
];

const files = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\0")
  .filter((f) => f && f !== SELF);

let total = 0;
for (const file of files) {
  const abs = path.join(repoRoot, file);
  let text: string;
  try {
    const buf = fs.readFileSync(abs);
    if (buf.includes(0)) continue; // binary
    text = buf.toString("utf8");
  } catch {
    continue; // deleted in the working tree
  }
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const { pattern, why } of BANNED) {
      if (pattern.test(lines[i])) {
        console.error(`${file}:${i + 1}  ${why}`);
        total++;
      }
    }
  }
}

if (total > 0) {
  console.error(`\ncheck:brand: ${total} line(s) use the former brand. The brand is TokensToScale.`);
  process.exit(1);
}
console.log(`check:brand: ${files.length} files checked, no former brand names.`);
