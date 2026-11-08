import { adminPage, formatDateTime, AdminShell, Panel, Table, auditSpan, recentAudit } from "@/features/admin";

const PATH = "/admin/audit";
const LIMIT = 100;

export default async function AdminAuditPage() {
  const { viewer, data } = await adminPage(PATH, async (db) => ({
    rows: await recentAudit(db, LIMIT),
    span: await auditSpan(db),
  }));

  return (
    <AdminShell
      current={PATH}
      title="Audit log"
      viewer={viewer}
      lead={`Admin views and billing actions, newest first. ${data.span.total} entries since ${formatDateTime(data.span.first)}.`}
    >
      <Panel title={`Latest ${Math.min(LIMIT, data.rows.length)}`}>
        <Table
          testId="audit-table"
          rows={data.rows}
          rowKey={(r) => r.id}
          columns={[
            { header: "When", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.at)}</span> },
            { header: "Actor", cell: (r) => <span className="text-[13px]">{r.actorEmail ?? r.actor}</span> },
            { header: "Action", cell: (r) => <code className="text-[12px]">{r.action}</code> },
            { header: "Target", cell: (r) => <span className="text-[13px]">{r.target ?? "—"}</span> },
            {
              header: "Details",
              cell: (r) =>
                r.meta ? (
                  <code className="break-all text-[12px] text-muted-foreground">
                    {JSON.stringify(r.meta).slice(0, 200)}
                  </code>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </Panel>
    </AdminShell>
  );
}
