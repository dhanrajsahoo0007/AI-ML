import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { ENTITLEMENT_COOKIE, parseKey, signEntitlement } from "../../src/server/edge/entitlement";
import { MAINTENANCE_MARKER } from "../../src/server/edge/maintenance";
import { parseKillList, sectionManifestSchema } from "../../src/server/edge/sections-gate";

// @core edge gate (plan §5.1.1): middleware hides `hidden` sections from everyone but admins, 404s `off`
// sections, and serves a 503 maintenance page for sections in SECTIONS_KILL.
//
// The hidden and off sections come from the manifest the server was built with
// (src/generated/hidden-routes.json). The server and this spec read the same variables, so:
//   - against `next start` (Playwright's webServer inherits the env):
//       SECTIONS_KILL=system-design ENTITLEMENT_SECRET=k1:<base64url> npx playwright test edge-gate
//   - against the Workers preview (`npm run preview -w web`, with the same values in apps/web/.dev.vars):
//       E2E_BASE_URL=http://localhost:8787 SECTIONS_KILL=… ENTITLEMENT_SECRET=… npx playwright test edge-gate
// Without SECTIONS_KILL / ENTITLEMENT_SECRET the kill-switch and admin tests are skipped.

const manifestFile = path.resolve(__dirname, "../../src/generated/hidden-routes.json");
const manifest = sectionManifestSchema.parse(
  fs.existsSync(manifestFile)
    ? JSON.parse(fs.readFileSync(manifestFile, "utf8"))
    : { env: "local", hidden: [], off: [] }
);
const killed = parseKillList(process.env.SECTIONS_KILL);
const adminKey = parseKey(process.env.ENTITLEMENT_SECRET);
// Hidden sections that are not also killed (a killed section is a 503 for everyone).
const hidden = manifest.hidden.filter((p) => !killed.includes(p));
const off = manifest.off.filter((p) => !killed.includes(p));

const RSC = { RSC: "1" };
/** What Next.js puts in the RSC payload of a not-found page (RSC requests for a missing page get a 200). */
const RSC_NOT_FOUND = "NEXT_HTTP_ERROR_FALLBACK;404";

test.describe("edge gate @core", () => {
  test("ordinary pages pass and carry the version header", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    expect(res.headers()["x-app-version"]).toMatch(/^(dev|[0-9a-f]{7,40})$/);
  });

  test("hidden sections 404 without the admin cookie (HTML, RSC and case variants)", async ({ request }) => {
    test.skip(hidden.length === 0, `no hidden sections in this build (env ${manifest.env})`);
    for (const prefix of hidden) {
      const res = await request.get(prefix);
      expect(res.status(), prefix).toBe(404);
      expect(res.headers()["cache-control"], prefix).toContain("no-store");
      const rsc = await request.get(prefix, { headers: RSC });
      if (rsc.status() !== 404)
        expect(await rsc.text(), `${prefix} (RSC) is the not-found tree`).toContain(RSC_NOT_FOUND);
      expect((await request.get(prefix.toUpperCase())).status(), prefix.toUpperCase()).toBe(404);
    }
  });

  test("hidden sections 404 with a forged or non-admin cookie", async ({ request }) => {
    test.skip(hidden.length === 0, `no hidden sections in this build (env ${manifest.env})`);
    const forgedKey = parseKey(`k1:${Buffer.alloc(32, 7).toString("base64url")}`)!;
    const forged = await signEntitlement({ sub: "e2e", tier: "pro", role: "admin", v: 1 }, forgedKey);
    const cookies = [`${ENTITLEMENT_COOKIE}=${forged}`, `${ENTITLEMENT_COOKIE}=not-a-token`];
    if (adminKey) {
      const user = await signEntitlement({ sub: "e2e", tier: "pro", role: "user", v: 1 }, adminKey);
      cookies.push(`${ENTITLEMENT_COOKIE}=${user}`);
    }
    for (const cookie of cookies) {
      expect((await request.get(hidden[0], { headers: { cookie } })).status()).toBe(404);
    }
  });

  test("hidden sections open for an admin, never cached by shared caches", async ({ request }) => {
    test.skip(hidden.length === 0, `no hidden sections in this build (env ${manifest.env})`);
    test.skip(!adminKey, "ENTITLEMENT_SECRET not set for this run");
    const token = await signEntitlement({ sub: "e2e-admin", tier: "pro", role: "admin", v: 1 }, adminKey!);
    const res = await request.get(hidden[0], { headers: { cookie: `${ENTITLEMENT_COOKIE}=${token}` } });
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("private");
    expect(res.headers()["x-robots-tag"]).toBe("noindex");
    expect(await res.text()).toContain("<h1");
  });

  test("off sections 404", async ({ request }) => {
    test.skip(off.length === 0, `no off sections in this build (env ${manifest.env})`);
    for (const prefix of off) expect((await request.get(prefix)).status(), prefix).toBe(404);
  });

  test("SECTIONS_KILL serves a 503 maintenance page for those sections only", async ({ request }) => {
    test.skip(killed.length === 0, "SECTIONS_KILL not set for this run");
    for (const prefix of killed) {
      for (const url of [prefix, `${prefix}/any/page`]) {
        const res = await request.get(url);
        expect(res.status(), url).toBe(503);
        expect(res.headers()["retry-after"], url).toMatch(/^\d+$/);
        expect(res.headers()["cache-control"], url).toBe("no-store");
        expect(await res.text(), url).toContain(MAINTENANCE_MARKER);
      }
    }
    expect((await request.get("/")).status()).toBe(200);
  });
});
