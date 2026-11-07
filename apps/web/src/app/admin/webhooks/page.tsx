import { adminPage } from "@/features/admin/access";
import { loadWebhooks } from "@/features/admin/dashboard";
import { formatAge, formatDateTime } from "@/features/admin/format";
import { AdminShell, Panel, Stat, StatGrid, Table } from "@/features/admin/ui";

const PATH = "/admin/webhooks";

export default async function AdminWebhooksPage() {
  const { viewer, data } = await adminPage(PATH, (db) => loadWebhooks(db));
  const received = data.providers.reduce((n, p) => n + p.received, 0);
  const backlog = data.providers.reduce((n, p) => n + p.backlog, 0);
  const failed = data.providers.reduce((n, p) => n + p.failed, 0);

  return (
    <AdminShell
      current={PATH}
      title="Webhook health"
      viewer={viewer}
      lead="Events from the payment and email providers. Target: 99.9% processed within one minute."
    >
      <StatGrid>
        <Stat label="Events received" testId="webhooks-received" value={received > 0 ? received : null} />
        <Stat
          label="Backlog (unprocessed)"
          testId="webhooks-backlog"
          value={received > 0 ? backlog : null}
          tone={received === 0 ? undefined : backlog > 0 ? "warn" : "ok"}
        />
        <Stat
          label="Older than 1 minute"
          testId="webhooks-stale"
          value={received > 0 ? data.stale : null}
          tone={received === 0 ? undefined : data.stale > 0 ? "alert" : "ok"}
        />
        <Stat
          label="Failed"
          testId="webhooks-failed"
          value={received > 0 ? failed : null}
          tone={received === 0 ? undefined : failed > 0 ? "alert" : "ok"}
        />
      </StatGrid>

      <Panel title="By provider">
        <Table
          testId="webhooks-providers"
          rows={data.providers}
          rowKey={(p) => p.provider}
          columns={[
            { header: "Provider", cell: (p) => p.provider },
            { header: "Received", cell: (p) => p.received, align: "right" },
            { header: "Backlog", cell: (p) => p.backlog, align: "right" },
            { header: "Failed", cell: (p) => p.failed, align: "right" },
            { header: "Oldest unprocessed", cell: (p) => formatAge(p.oldestBacklogAt) },
            { header: "Last received", cell: (p) => formatAge(p.lastReceivedAt) },
            { header: "Last processed", cell: (p) => formatAge(p.lastProcessedAt) },
          ]}
        />
      </Panel>

      <Panel title="Recent errors" note="Latest 25 events that recorded an error. Payloads are not shown.">
        <Table
          testId="webhooks-errors"
          empty="No errors recorded."
          rows={data.errors}
          rowKey={(e) => e.id}
          columns={[
            { header: "Received", cell: (e) => formatDateTime(e.receivedAt) },
            { header: "Provider", cell: (e) => e.provider },
            { header: "Type", cell: (e) => e.type },
            { header: "Event", cell: (e) => <code className="text-[12px]">{e.eventId}</code> },
            { header: "Processed", cell: (e) => (e.processedAt ? "retried ok" : "no") },
            {
              header: "Error",
              cell: (e) => <span className="break-words text-[13px]">{e.error.slice(0, 300)}</span>,
            },
          ]}
        />
      </Panel>
    </AdminShell>
  );
}
