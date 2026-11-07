// Scheduled billing jobs, runnable by hand or from CI until the Worker gets a Cron Trigger (plan §9.3, §9.7):
//
//   npx tsx --import ./scripts/ts-hooks.mjs scripts/billing-jobs.ts reconcile   # provider → database drift fix
//   npx tsx --import ./scripts/ts-hooks.mjs scripts/billing-jobs.ts reminders   # T-7 yearly renewal emails
//
// Reads DATABASE_URL, APP_ENV and the billing variables (src/server/env.ts) from the environment.
import { primaryProvider } from "../src/features/billing/provider";
import { reconcile } from "../src/features/billing/reconcile";
import { sendRenewalReminders } from "../src/features/billing/reminders";
import { emailSender } from "../src/features/newsletter/server";
import { SITE_URL } from "../src/config/business";
import { withDb } from "../src/server/db/client";
import { serverEnv } from "../src/server/env";

const job = process.argv[2];

if (job === "reconcile") {
  const report = await withDb((db) => reconcile(db, primaryProvider(serverEnv())), { label: "job:reconcile" });
  console.log(JSON.stringify(report));
  // Plan §9.3: alert when more than 0.5% of subscriptions drifted.
  if (report.driftRatio > 0.005) process.exitCode = 2;
} else if (job === "reminders") {
  const result = await withDb((db) => sendRenewalReminders(db, emailSender(), { siteUrl: SITE_URL }), {
    label: "job:reminders",
  });
  console.log(JSON.stringify(result));
} else {
  console.error("usage: billing-jobs.ts reconcile | reminders");
  process.exitCode = 1;
}
