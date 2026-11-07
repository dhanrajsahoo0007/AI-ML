import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loadBuiltRoutes } from "./support/built-routes";
import { desktopHeaderEntries, mobileMenu } from "./support/header-nav";
import { builtAppEnv, buildSections, findLinksTo, isUnder } from "./support/registry";

// @core section release states (plan §5.1.1, §12.2). CI runs this against two builds: APP_ENV=preview and
// APP_ENV=production. Which sections are `on`, `hidden` or `off` comes from content/sections.yaml through the
// registry module, resolved for the environment the build was made for, so nothing here names a section.
//
//   off     no pages built; every URL under it returns 404
//   hidden  pages built (middleware admits admins only, Phase 3) but noindex, and absent from the header, the
//           mobile menu, the sitemap, Company Questions and links on every page outside the section
//   on      in the header and the sitemap

const env = builtAppEnv();
const sections = buildSections(env);
const off = sections.filter((s) => s.state === "off");
const hidden = sections.filter((s) => s.state === "hidden");
const notOn = sections.filter((s) => s.state !== "on");
const { ok } = loadBuiltRoutes();

const webRoot = path.resolve(__dirname, "../..");

test.describe(`section release states, APP_ENV=${env} @core`, () => {
  test("the build was made for the expected environment", () => {
    // CI sets EXPECT_APP_ENV so a build made with the wrong profile fails here instead of passing vacuously.
    test.skip(!process.env.EXPECT_APP_ENV, "EXPECT_APP_ENV not set");
    expect(env).toBe(process.env.EXPECT_APP_ENV);
  });

  for (const s of off) {
    test(`off: ${s.key} has no pages and returns 404`, async ({ request }) => {
      expect(
        ok.filter((r) => isUnder(r, s.href)),
        `built pages under ${s.href}`
      ).toEqual([]);
      // Redirects are followed (`/x/` → `/x` is Next's trailing-slash redirect); every URL must end in a 404.
      for (const url of [s.href, `${s.href}/`, `${s.href}/any-page`, `${s.href}/a/b`]) {
        const res = await request.get(url);
        expect(res.status(), url).toBe(404);
      }
    });
  }

  for (const s of hidden) {
    test(`hidden: ${s.key} is not indexable`, async ({ request }) => {
      const pages = ok.filter((r) => isUnder(r, s.href));
      // Middleware (Phase 3) will answer 404 to anonymous visitors; until then the built pages must be noindex.
      for (const url of [s.href, ...pages.slice(0, 3)]) {
        const res = await request.get(url, { maxRedirects: 0 });
        if (res.status() === 404) continue;
        expect(res.status(), url).toBe(200);
        expect(await res.text(), `robots meta on ${url}`).toMatch(/<meta name="robots" content="noindex/);
      }
    });
  }

  test("the desktop header lists exactly the sections that are on", async ({ page }) => {
    const entries = await desktopHeaderEntries(page);
    const labels = entries.map((e) => e.label);
    for (const s of sections) {
      if (s.state === "on") {
        expect(labels, `header entry for ${s.key}`).toContain(s.label);
      } else {
        expect(labels, `header entry for ${s.key} (${s.state})`).not.toContain(s.label);
        expect(entries.filter((e) => e.href && isUnder(e.href, s.href))).toEqual([]);
      }
    }
  });

  test("the mobile menu has no hidden or off sections", async ({ page }) => {
    const { hrefs, text } = await mobileMenu(page);
    for (const s of notOn) {
      expect(
        hrefs.filter((h) => isUnder(h, s.href)),
        `links to ${s.href}`
      ).toEqual([]);
      expect(
        text.split("\n").map((l) => l.trim()),
        `${s.label} in the mobile menu`
      ).not.toContain(s.label);
    }
  });

  test("the sitemap lists on sections and nothing hidden or off", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const paths = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    expect(paths.length).toBeGreaterThan(10);
    for (const s of sections) {
      const listed = paths.filter((p) => isUnder(p, s.href));
      if (s.state === "on" && ok.includes(s.href)) expect(listed, `${s.href} in the sitemap`).toContain(s.href);
      if (s.state !== "on") expect(listed, `${s.key} (${s.state}) in the sitemap`).toEqual([]);
    }
  });

  test("Company Questions counts nothing from hidden or off sections", async ({ request }) => {
    const companies = sections.find((s) => s.kind === "directory" && s.state !== "off");
    test.skip(!companies, "no directory section in this build");
    const html = await (await request.get(companies!.href)).text();
    for (const s of notOn) expect(findLinksTo(html, s.href), `links to ${s.href} on ${companies!.href}`).toEqual([]);
  });

  test("the client bundles carry no nav entry for hidden or off sections", () => {
    const staticDir = path.join(webRoot, ".next", "static");
    test.skip(!!process.env.E2E_BASE_URL || !fs.existsSync(staticDir), "needs a local build");
    const files = fs.readdirSync(staticDir, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".js"));
    // next.config.ts inlines the public nav (SECTION_NAV) as JSON text into the client bundles.
    const needles = notOn.flatMap((s) => [`"key":"${s.key}"`, `\\"key\\":\\"${s.key}\\"`]);
    const hits = files.flatMap((f) => {
      const text = fs.readFileSync(path.join(staticDir, f), "utf8");
      return needles.filter((n) => text.includes(n)).map((n) => `${f}: ${n}`);
    });
    expect(hits).toEqual([]);
  });
});

// No page outside a hidden or off section links into one (HTML and the inlined RSC payload).
const outside = ok.filter((r) => !notOn.some((s) => isUnder(r, s.href)));
const CHUNK = 40;
test.describe(`no links into hidden or off sections, APP_ENV=${env} @core`, () => {
  test.skip(notOn.length === 0, "every section is on");
  for (let i = 0; i < outside.length; i += CHUNK) {
    const urls = outside.slice(i, i + CHUNK);
    test(`pages ${i + 1}–${i + urls.length} of ${outside.length}`, async ({ request }) => {
      const found: string[] = [];
      for (const url of urls) {
        const html = await (await request.get(url)).text();
        for (const s of notOn) found.push(...findLinksTo(html, s.href).map((href) => `${url} → ${href}`));
      }
      expect(found).toEqual([]);
    });
  }
});
