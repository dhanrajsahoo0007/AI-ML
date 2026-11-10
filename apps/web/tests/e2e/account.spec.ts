import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { dbE2E, loginAs, reseed, SKIP_REASON, sql, TEST_USERS, testUserEmail } from "../fixtures/users";

// @core account pages (plan §8.3, §11.2): profile, connected Google account, devices, export, delete and the
// 10-minute re-authentication rule. Needs E2E_DB=1 (see tests/fixtures/users.ts).

test.describe("account @core", () => {
  test.skip(!dbE2E, SKIP_REASON);
  // on_hold and pro_expired are used only by this file (auth.spec.ts uses the others).
  test.beforeEach(() => reseed("on_hold", "pro_expired"));
  test.describe.configure({ mode: "serial" });

  test("signed out, account pages send you to sign-in", async ({ page }) => {
    await page.goto("/account/data");
    await expect(page).toHaveURL(/\/sign-in\?callbackURL=%2Faccount%2Fdata$/);
  });

  test("shows the profile, the plan and this device", async ({ page, context }) => {
    await loginAs(context, "on_hold");
    await page.goto("/account");
    await expect(page.getByTestId("account-name")).toHaveText(TEST_USERS.on_hold.name);
    await expect(page.getByTestId("account-email")).toHaveText(testUserEmail("on_hold"));
    // on_hold keeps Pro during the grace period.
    await expect(page.getByTestId("account-plan")).toHaveText(/^Pro/);
    await expect(page.getByTestId("account-sessions")).toContainText("This device");
  });

  test("exports your own data as JSON", async ({ page, context }) => {
    await loginAs(context, "on_hold");
    await page.goto("/account/data");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download my data (JSON)" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^tokenstoscale-export-\d{4}-\d{2}-\d{2}\.json$/);
    const text = fs.readFileSync((await download.path())!, "utf8");
    const data = JSON.parse(text);
    expect(data.profile.email).toBe(testUserEmail("on_hold"));
    expect(data.billing.subscriptions[0]).toMatchObject({ status: "on_hold", plan: "pro_monthly" });
    for (const other of ["free", "pro_monthly", "pro_yearly", "pro_expired", "admin"] as const) {
      expect(text).not.toContain(testUserEmail(other));
    }
    expect(text).not.toMatch(/"token"|accessToken|refreshToken/);
  });

  test("export and delete ask for a fresh sign-in after 10 minutes", async ({ page, context }) => {
    await loginAs(context, "pro_expired");
    await sql(
      `update session set created_at = now() - interval '11 minutes'
       where user_id = (select id from "user" where email = $1)`,
      [testUserEmail("pro_expired")]
    );
    await page.goto("/account/data");
    await expect(page.getByTestId("reauth-note")).toBeVisible();
    await page.getByRole("button", { name: "Download my data (JSON)" }).click();
    await expect(page).toHaveURL(/\/sign-in\?reauth=1&callbackURL=%2Faccount%2Fdata$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confirm it's you");
  });

  test("deletes the account and everything in it", async ({ page, context }) => {
    await loginAs(context, "pro_expired");
    await page.goto("/account/data");
    const button = page.getByRole("button", { name: "Delete my account" });
    await expect(button).toBeDisabled();
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await button.click();
    await expect(page).toHaveURL(/\/\?account=deleted$/);

    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in/);
    // The seeded user is gone, so the test login can't find it any more.
    await expect(loginAs(context, "pro_expired")).rejects.toThrow(/404/);
  });
});
