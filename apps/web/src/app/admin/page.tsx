import {
  adminPage,
  loadKpis,
  formatAge,
  formatPercent,
  formatUsdMinor,
  DISPUTE_RATE_ALERT,
  REFUND_RATE_TARGET,
  type Breakdown,
  AdminShell,
  Panel,
  Sparkline,
  Stat,
  StatGrid,
  Table,
  type Column,
} from "@/features/admin";

const PATH = "/admin";

const breakdownColumns = (label: string): Column<Breakdown>[] => [
  { header: label, cell: (b) => b.key },
  { header: "Subscribers", cell: (b) => b.subscribers, align: "right" },
  { header: "MRR (USD)", cell: (b) => formatUsdMinor(b.mrrUsdMinor), align: "right" },
  { header: "Share", cell: (b) => formatPercent(b.share), align: "right" },
];

export default async function AdminKpisPage() {
  const { viewer, data: k } = await adminPage(PATH, (db) => loadKpis(db));
  const hasSubs = k.mrr.subscribers > 0 || k.mrr.atRisk.subscribers > 0;
  const hasPayments = k.payments.charged > 0 || k.payments.failed > 0;
  const list = k.mailingList;
  const hasList = list.active + list.pending + list.unsubscribed + list.bounced > 0;

  return (
    <AdminShell
      current={PATH}
      title="Business KPIs"
      viewer={viewer}
      lead={`Live subscriptions now; movements, payments and revenue over the last ${k.windowDays} days. Amounts in USD.`}
    >
      <Panel
        title="Recurring revenue"
        testId="kpi-revenue"
        note="Active subscriptions; yearly plans count as a twelfth per month. Converted at the provider's settled rate, else the daily fx_rate."
      >
        <StatGrid>
          <Stat label="MRR (USD)" testId="kpi-mrr" value={hasSubs ? formatUsdMinor(k.mrr.mrrUsdMinor) : null} />
          <Stat label="ARR (USD)" testId="kpi-arr" value={hasSubs ? formatUsdMinor(k.mrr.arrUsdMinor) : null} />
          <Stat label="Active subscribers" testId="kpi-active" value={hasSubs ? k.mrr.subscribers : null} />
          <Stat
            label="On hold (renewal failing)"
            testId="kpi-on-hold"
            value={hasSubs ? k.mrr.atRisk.subscribers : null}
            hint={k.mrr.atRisk.subscribers > 0 ? `${formatUsdMinor(k.mrr.atRisk.mrrUsdMinor)} MRR at risk` : undefined}
            tone={k.mrr.atRisk.subscribers > 0 ? "warn" : undefined}
          />
        </StatGrid>
        {k.mrr.unconverted.subscribers > 0 && (
          <p
            role="status"
            className="mt-3 text-[13px] text-amber-700 dark:text-amber-400"
            data-testid="kpi-unconverted"
          >
            {k.mrr.unconverted.subscribers} active subscription(s) in {k.mrr.unconverted.currencies.join(", ")} have no
            USD rate yet and are left out of MRR.
          </p>
        )}
      </Panel>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel title="MRR by country">
          <Table
            testId="mrr-by-country"
            columns={breakdownColumns("Country")}
            rows={k.mrr.by.country}
            rowKey={(b) => b.key}
          />
        </Panel>
        <Panel title="MRR by currency">
          <Table
            testId="mrr-by-currency"
            columns={breakdownColumns("Currency")}
            rows={k.mrr.by.currency}
            rowKey={(b) => b.key}
          />
        </Panel>
        <Panel title="MRR by price tier">
          <Table
            testId="mrr-by-tier"
            columns={breakdownColumns("Tier")}
            rows={k.mrr.by.priceTier}
            rowKey={(b) => b.key}
          />
        </Panel>
        <Panel title="MRR by provider">
          <Table
            testId="mrr-by-provider"
            columns={breakdownColumns("Provider")}
            rows={k.mrr.by.provider}
            rowKey={(b) => b.key}
          />
        </Panel>
      </div>

      <Panel title={`Subscribers, last ${k.windowDays} days`} testId="kpi-churn">
        <StatGrid>
          <Stat label="New" testId="kpi-new" value={hasSubs || k.churn.created > 0 ? k.churn.created : null} />
          <Stat
            label="Churned"
            testId="kpi-churned"
            value={k.churn.rate === null && k.churn.churned === 0 ? null : k.churn.churned}
            hint={k.churn.rate === null ? undefined : `${formatPercent(k.churn.rate)} of subscribers at the start`}
          />
          <Stat
            label="Voluntary (cancelled)"
            testId="kpi-voluntary"
            value={k.churn.churned > 0 ? k.churn.voluntary : null}
          />
          <Stat
            label="Involuntary (on hold → failed)"
            testId="kpi-involuntary"
            value={k.churn.churned > 0 ? k.churn.involuntary : null}
          />
        </StatGrid>
      </Panel>

      <Panel title={`Payments, last ${k.windowDays} days`} testId="kpi-payments">
        <StatGrid>
          <Stat
            label="Revenue collected (USD)"
            testId="kpi-collected"
            value={k.revenue.payments > 0 ? formatUsdMinor(k.revenue.totalUsdMinor) : null}
            hint={k.revenue.unconverted > 0 ? `${k.revenue.unconverted} payment(s) without a USD amount` : undefined}
          >
            {k.revenue.payments > 0 && (
              <Sparkline
                values={k.revenue.series.map((d) => d.value)}
                label={`Daily revenue in USD over the last ${k.windowDays} days`}
              />
            )}
          </Stat>
          <Stat
            label="Refund rate"
            testId="kpi-refund-rate"
            value={hasPayments ? formatPercent(k.payments.refundRate) : null}
            hint={`${k.payments.refunds} of ${k.payments.charged} charged · target < ${formatPercent(REFUND_RATE_TARGET, 0)}`}
            tone={!hasPayments ? undefined : k.payments.refundAboveTarget ? "warn" : "ok"}
          />
          <Stat
            label="Dispute rate"
            testId="kpi-dispute-rate"
            value={hasPayments ? formatPercent(k.payments.disputeRate, 2) : null}
            hint={`${k.payments.disputes} disputed · alert above ${formatPercent(DISPUTE_RATE_ALERT, 2)}`}
            tone={!hasPayments ? undefined : k.payments.disputeAlert ? "alert" : "ok"}
          />
          <Stat
            label="7-day guarantee refunds"
            testId="kpi-guarantee"
            value={hasPayments ? k.payments.guaranteeRefunds : null}
            hint="Refunded within 7 days of the payment"
          />
        </StatGrid>
        <p
          className={
            k.payments.noRecentPayments
              ? "mt-3 text-[13px] font-medium text-red-700 dark:text-red-400"
              : "mt-3 text-[13px] text-muted-foreground"
          }
          role={k.payments.noRecentPayments ? "alert" : undefined}
          data-testid="kpi-last-payment"
        >
          Last successful payment: {formatAge(k.payments.lastSucceededAt)}
          {k.payments.noRecentPayments && " — none in 6 hours with paying subscribers: check the provider."}
        </p>
      </Panel>

      <Panel title="Mailing list" testId="kpi-mailing-list">
        <StatGrid>
          <Stat label="Active" testId="kpi-list-active" value={hasList ? list.active : null} />
          <Stat label="Pending confirmation" testId="kpi-list-pending" value={hasList ? list.pending : null} />
          <Stat label="Unsubscribed" testId="kpi-list-unsubscribed" value={hasList ? list.unsubscribed : null} />
          <Stat label="Bounced or complained" testId="kpi-list-bounced" value={hasList ? list.bounced : null} />
        </StatGrid>
      </Panel>
    </AdminShell>
  );
}
