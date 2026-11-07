import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { builtAppEnv, buildSections } from "./support/registry";

// DSA section (plan §15.1): the problem list filters, the in-browser runner (JavaScript and Python, public
// tests only), copy protection around the editor, the premium editorial gate and hidden tests never being
// served. The section is found by kind in the registry, resolved for the build under test; in a build where
// it is off (production today), every DSA URL must be a 404.

const env = builtAppEnv();
const section = buildSections(env).find((s) => s.kind === "problems")!;
const LIST = `${section.href}/problems`;
const TWO_SUM = `${LIST}/two-sum`;
const ISLANDS = `${LIST}/number-of-islands`;
const contentDir = path.resolve(__dirname, "../../content", section.key);

const JS_SOLUTION = `function twoSum(nums, target) {
  const seen = new Map();
  for (let j = 0; j < nums.length; j++) {
    const i = seen.get(target - nums[j]);
    if (i !== undefined) return [i, j];
    seen.set(nums[j], j);
  }
}`;

const PY_SOLUTION = `def two_sum(nums, target):
    seen = {}
    for j, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], j]
        seen[x] = j
`;

async function open(page: Page, url: string) {
  const res = await page.goto(url);
  expect(res?.status(), url).toBe(200);
  // The root client islands hydrate together; the copy-protection island marks the body when it has.
  await expect(page.locator("body")).toHaveAttribute("data-print-notice", /Read it at/);
}

/** Opens the editor and replaces its content, the way a visitor pastes a solution. */
async function writeCode(page: Page, code: string) {
  const workspace = page.locator("[data-dsa-workspace]");
  if ((await page.locator(".cm-content").count()) === 0)
    await workspace.getByRole("button", { name: "Edit code" }).click();
  const editor = page.locator(".cm-content");
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(code);
  await expect(editor).toContainText(code.split("\n")[0]);
}

async function runTests(page: Page) {
  await page.getByRole("button", { name: "Run tests" }).click();
}

const caseStatuses = (page: Page) =>
  page.locator("[data-case-status]").evaluateAll((els) => els.map((e) => e.getAttribute("data-case-status")));

test.describe(`DSA, APP_ENV=${env} @core`, () => {
  test.skip(section.state === "off", "DSA is off in this build");

  test("the problem list filters by difficulty, pattern and company", async ({ page }) => {
    await open(page, LIST);
    const titles = () => page.getByRole("list", { name: "Problems" }).getByRole("link").allInnerTexts();
    const filters = page.getByRole("form", { name: "Filter problems" });
    expect(await titles()).toEqual(["Two Sum", "Number of Islands", "LRU Cache"]);

    await filters.getByLabel("Difficulty").selectOption("medium");
    await expect(page.locator("[data-problem-count]")).toHaveText("2 of 3 problems");
    expect(await titles()).toEqual(["Number of Islands", "LRU Cache"]);

    await filters.getByLabel("Pattern").selectOption("depth-first-search");
    expect(await titles()).toEqual(["Number of Islands"]);

    await page.getByRole("button", { name: "Clear filters" }).click();
    await filters.getByLabel("Company").selectOption("apple");
    expect(await titles()).toEqual(["Two Sum", "LRU Cache"]);

    await filters.getByLabel("Difficulty").selectOption("easy");
    expect(await titles()).toEqual(["Two Sum"]);

    await filters.getByLabel("Difficulty").selectOption("");
    await filters.getByLabel("Pattern").selectOption("depth-first-search");
    await expect(page.getByText("No problems match these filters yet.")).toBeVisible();
  });

  test("the editor loads on interaction, not with the page", async ({ page }) => {
    await open(page, TWO_SUM);
    await page.waitForLoadState("networkidle");
    const scripts = () =>
      page.evaluate(() => performance.getEntriesByType("resource").filter((e) => e.name.endsWith(".js")).length);
    const before = await scripts();
    await expect(page.locator(".cm-editor")).toHaveCount(0);
    await expect(page.locator("[data-code-preview]")).toContainText("function twoSum(nums, target)");
    await page.locator("[data-code-preview]").click();
    await expect(page.locator(".cm-editor")).toBeVisible();
    expect(await scripts()).toBeGreaterThan(before);
    await expect(page.locator(".cm-content")).toBeFocused();
  });

  test("Two Sum in JavaScript passes the public tests", async ({ page }) => {
    await open(page, TWO_SUM);
    await writeCode(page, JS_SOLUTION);
    await runTests(page);
    await expect(page.locator("[data-summary]")).toHaveText("4 of 4 tests passed");
    expect(await caseStatuses(page)).toEqual(["pass", "pass", "pass", "pass"]);
  });

  test("a wrong solution fails, with the expected and actual values", async ({ page }) => {
    await open(page, TWO_SUM);
    await writeCode(page, "function twoSum(nums, target) {\n  return [0, 0];\n}");
    await runTests(page);
    await expect(page.locator("[data-summary]")).toHaveText("0 of 4 tests passed");
    expect(await caseStatuses(page)).toEqual(["fail", "fail", "fail", "fail"]);
    const first = page.locator("[data-case-status]").first();
    await expect(first).toContainText("Wrong answer");
    await expect(first).toContainText("[0,1]");
    await expect(first).toContainText("[0,0]");
  });

  test("an infinite loop stops after the time limit and the network is unavailable", async ({ page }) => {
    await open(page, TWO_SUM);
    await writeCode(page, "function twoSum() {\n  while (true) {}\n}");
    await runTests(page);
    await expect(page.locator("[data-summary]")).toHaveText("0 of 4 tests passed", { timeout: 10_000 });
    expect(await caseStatuses(page)).toEqual(["timeout", "skipped", "skipped", "skipped"]);
    await expect(page.locator("[data-case-status]").first()).toContainText("Time limit exceeded");

    await writeCode(
      page,
      "function twoSum() {\n  return [typeof fetch, typeof self.fetch, typeof XMLHttpRequest, typeof WebSocket];\n}"
    );
    await runTests(page);
    await expect(page.locator("[data-case-status]").first()).toContainText(
      '["undefined","undefined","undefined","undefined"]'
    );
  });

  test("the editor allows typing, selecting and pasting; the statement stays protected", async ({ page }) => {
    await open(page, TWO_SUM);
    await writeCode(page, "function twoSum(nums, target) {\n}");
    const editor = page.locator(".cm-content");
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.type("// typed");
    await expect(editor).toContainText("// typed");

    await page.keyboard.press("ControlOrMeta+a");
    expect(await page.evaluate(() => getSelection()?.toString() ?? "")).toContain("function twoSum");

    const pasted = await editor.evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "const pasted = 1;");
      const ev = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data });
      el.dispatchEvent(ev);
      return el.textContent;
    });
    expect(pasted).toContain("const pasted = 1;");

    // Copy inside the editor puts the code on the clipboard; copy from the statement puts the notice there.
    const copy = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => {
          const data = new DataTransfer();
          el.dispatchEvent(new ClipboardEvent("copy", { bubbles: true, cancelable: true, clipboardData: data }));
          return data.getData("text/plain");
        });
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    expect(await copy(".cm-content"), "copy inside the editor").toContain("const pasted = 1;");
    expect(await copy("[data-dsa-statement] p"), "copy from the statement").toMatch(/^Content © /);
    await expect(page.locator("[data-dsa-statement] p").first()).toHaveCSS("user-select", "none");
  });

  test("a free problem shows its editorial; a premium one shows the Pro placeholder only", async ({
    page,
    request,
  }) => {
    await open(page, TWO_SUM);
    await expect(page.locator("[data-dsa-editorial]")).toContainText("One pass with a hash map");

    const html = await (await request.get(ISLANDS)).text();
    expect(html).toContain('class="oa-paywalled"');
    expect(html).not.toContain("Depth-first flood fill");
    expect(html).not.toContain("explicit stack avoids the recursion limit");
    const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) =>
      JSON.parse(m[1])
    );
    const article = jsonLd.flatMap((d) => d["@graph"]).find((n) => n["@type"] === "Article");
    expect(article).toMatchObject({ isAccessibleForFree: false, hasPart: { cssSelector: ".oa-paywalled" } });
  });

  test("hidden tests are never served", async ({ request }) => {
    const problems = fs.readdirSync(path.join(contentDir, "problems")).map((f) => f.replace(/\.mdx$/, ""));
    expect(problems.length).toBeGreaterThanOrEqual(3);
    for (const slug of problems) {
      const hidden = JSON.parse(fs.readFileSync(path.join(contentDir, "tests", `${slug}.hidden.json`), "utf8")) as {
        name: string;
      }[];
      const html = await (await request.get(`${LIST}/${slug}`)).text();
      const rsc = await (await request.get(`${LIST}/${slug}`, { headers: { RSC: "1" } })).text();
      for (const tc of hidden) {
        expect(html, `${slug}: hidden case "${tc.name}" in the HTML`).not.toContain(tc.name);
        expect(rsc, `${slug}: hidden case "${tc.name}" in the RSC payload`).not.toContain(tc.name);
      }
      expect(html).not.toContain(".hidden.json");
    }
  });
});

test.describe(`DSA Python runner, APP_ENV=${env} @full`, () => {
  test.skip(section.state === "off", "DSA is off in this build");
  // Pyodide (about 10 MB) comes from its CDN on the first run.
  test.setTimeout(180_000);

  test("Two Sum in Python passes the public tests, and a wrong one fails", async ({ page }) => {
    await open(page, TWO_SUM);
    await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "Python" }).click();
    await expect(page.locator("[data-code-preview]")).toContainText("def two_sum");
    await writeCode(page, PY_SOLUTION);
    await runTests(page);
    await expect(page.locator("[data-summary]")).toHaveText("4 of 4 tests passed", { timeout: 150_000 });

    await writeCode(page, "def two_sum(nums, target):\n    print('trying', target)\n    return [1, 0]\n");
    await runTests(page);
    await expect(page.locator("[data-summary]")).toHaveText("0 of 4 tests passed", { timeout: 30_000 });
    const first = page.locator("[data-case-status]").first();
    await expect(first).toContainText("Wrong answer");
    await expect(first).toContainText("trying 9");
  });
});

test.describe(`DSA is a 404 where it is off, APP_ENV=${env} @core`, () => {
  test.skip(section.state !== "off", "DSA is built in this environment");

  test("every DSA URL returns 404", async ({ request }) => {
    for (const url of [section.href, LIST, TWO_SUM, `${section.href}/hash-maps`]) {
      expect((await request.get(url)).status(), url).toBe(404);
    }
  });
});
