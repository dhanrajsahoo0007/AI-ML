import { adminPage, loadSectionStates, AdminShell, Panel, Table } from "@/features/admin";
import { cn } from "@/lib/utils";

const PATH = "/admin/sections";

const stateClass = {
  on: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300",
  hidden: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  off: "bg-paper-2 text-muted-foreground",
} as const;

function State({ value, current }: { value: keyof typeof stateClass; current?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[12px] font-medium",
        stateClass[value],
        current && "ring-1 ring-ink"
      )}
    >
      {value}
    </span>
  );
}

export default async function AdminSectionsPage() {
  const { viewer, data } = await adminPage(PATH, () => loadSectionStates());

  return (
    <AdminShell
      current={PATH}
      title="Sections"
      viewer={viewer}
      lead={
        <>
          Release state per environment from <code>content/sections.yaml</code>. This deployment is{" "}
          <strong data-testid="sections-env">{data.env}</strong>; change a state only through a pull request (or the{" "}
          <code>SECTIONS_KILL</code> variable in an emergency).
        </>
      }
    >
      <Panel title="Registry">
        <Table
          testId="sections-table"
          rows={data.rows}
          rowKey={(r) => r.key}
          columns={[
            {
              header: "Section",
              cell: (r) => (
                <>
                  <span className="text-ink">{r.label}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {r.href} · {r.kind}
                    {r.owner ? ` · ${r.owner}` : ""}
                  </span>
                </>
              ),
            },
            ...data.envs.map((env) => ({
              header: env,
              cell: (r: (typeof data.rows)[number]) => <State value={r.release[env]} current={env === data.env} />,
            })),
            {
              header: "Items",
              align: "right" as const,
              cell: (r) =>
                r.counts ? (
                  <>
                    {r.counts.written}
                    {r.counts.outline > 0 && (
                      <span className="block text-[12px] text-muted-foreground">+{r.counts.outline} outline</span>
                    )}
                  </>
                ) : (
                  <span className="text-[12px] text-muted-foreground" title={r.countError ?? undefined}>
                    unavailable
                  </span>
                ),
            },
          ]}
        />
      </Panel>
    </AdminShell>
  );
}
