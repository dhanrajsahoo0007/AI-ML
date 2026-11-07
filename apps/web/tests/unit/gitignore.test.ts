import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Security review L9: no env file can be committed by accident, at the root or in the app; examples can.

const root = path.resolve(__dirname, "../../../..");
const ignored = (file: string) => {
  try {
    execFileSync("git", ["check-ignore", "-q", "--no-index", file], { cwd: root });
    return true;
  } catch {
    return false;
  }
};

describe(".gitignore", () => {
  it.each([".env", ".env.local", ".env.production", ".env.staging", "apps/web/.env.production", "apps/web/.env"])(
    "ignores %s",
    (file) => expect(ignored(file)).toBe(true)
  );

  it("keeps example files committable", () => {
    expect(ignored(".env.example")).toBe(false);
  });
});
