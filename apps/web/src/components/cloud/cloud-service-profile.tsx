import Link from "next/link";
import { AlertTriangle, ArrowRight, ArrowUpRight, Check, Info, X } from "lucide-react";
import { SERVICE_BY_ID, capabilitiesOfService, type ProviderId } from "@/lib/cloud-catalog";
import { FitMark, PROVIDER_TONE, ProviderTag, ServiceChip, providerOrder } from "./shared";

// Profile card for one service: what it is, what you still manage, how it scales and bills, when to use it, and
// the matching service on the other two clouds. The card's id is the service id, so tables can link to it. When the
// catalog names a concept page for the service, the header links to it ("Learn the idea") next to the vendor docs.
// Usage in MDX: <CloudServiceProfile id="aws-fargate" />
export function CloudServiceProfile({ id }: { id: string }) {
  const s = SERVICE_BY_ID[id];
  if (!s) return <p className="text-sm text-muted-foreground">Unknown cloud service: {id}</p>;
  const tone = PROVIDER_TONE[s.provider];
  const facts: [string, string][] = [
    ["You manage", s.youManage],
    ["Scales by", s.scaling],
    ["Pricing", s.pricing],
  ];
  const others = providerOrder(s.provider).slice(1) as ProviderId[];
  const equivalents = capabilitiesOfService(id);

  return (
    <div id={s.id} className="my-8 scroll-mt-24 overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="border-b border-hairline p-4 sm:p-5" style={{ background: `var(--dg-${tone}-soft)` }}>
        <div className="flex flex-wrap items-center gap-2">
          <ProviderTag id={s.provider} className="bg-paper" />
          <span className="font-display text-xl font-semibold leading-tight text-ink">{s.name}</span>
          <span className="ml-auto inline-flex items-center gap-3">
            {s.concept && (
              <Link
                href={s.concept}
                className="inline-flex items-center gap-0.5 text-xs text-muted-foreground no-underline! hover:text-ink"
              >
                Learn the idea <ArrowRight className="size-3" />
              </Link>
            )}
            <a
              href={s.docs}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground no-underline! hover:text-ink"
            >
              Docs <ArrowUpRight className="size-3" />
            </a>
          </span>
        </div>
        <div className="mt-1.5 text-[15px] leading-snug text-ink-2">{s.tagline}</div>
        {s.status && (
          <div
            className="mt-3 flex gap-2 rounded-lg border-l-2 bg-paper px-3 py-2 text-sm text-ink-2"
            style={{ borderColor: "var(--dg-red)" }}
          >
            <Info className="mt-0.5 size-4 shrink-0" style={{ color: "var(--dg-red)" }} aria-hidden />
            <span>{s.status}</span>
          </div>
        )}
      </div>

      <dl className="divide-y divide-hairline">
        {facts.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[7.5rem_1fr] sm:gap-3 sm:px-5">
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{k}</dt>
            <dd className="text-ink-2">{v}</dd>
          </div>
        ))}
        {equivalents.length > 0 && (
          <div className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[7.5rem_1fr] sm:gap-3 sm:px-5">
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">Elsewhere</dt>
            <dd className="space-y-1.5">
              {others.map((p) => {
                // The first capability is the service's main job; later ones add context in the tables.
                const a = equivalents[0][p];
                return (
                  <div key={p} className="flex flex-wrap items-center gap-1.5">
                    <ProviderTag id={p} />
                    <FitMark fit={a.fit} />
                    {a.services.map((x) => (
                      <ServiceChip key={x} name={x} />
                    ))}
                  </div>
                );
              })}
            </dd>
          </div>
        )}
      </dl>

      {(s.useWhen.length > 0 || s.avoidWhen.length > 0) && (
        <div className="grid border-t border-hairline sm:grid-cols-2">
          <List title="Use it when" items={s.useWhen} kind="good" first />
          <List title="Avoid it when" items={s.avoidWhen} kind="bad" />
        </div>
      )}
      {s.gotchas.length > 0 && (
        <div className="border-t border-hairline">
          <List title="Limits and surprises" items={s.gotchas} kind="warn" />
        </div>
      )}
    </div>
  );
}

function List({
  title,
  items,
  kind,
  first = false,
}: {
  title: string;
  items: string[];
  kind: "good" | "bad" | "warn";
  first?: boolean;
}) {
  if (items.length === 0) return <div className="hidden sm:block" />;
  const tone = kind === "good" ? "var(--dg-green)" : kind === "bad" ? "var(--dg-red)" : "var(--dg-orange)";
  const Icon = kind === "good" ? Check : kind === "bad" ? X : AlertTriangle;
  return (
    <div className={first ? "border-b border-hairline p-4 sm:border-b-0 sm:border-r sm:p-5" : "p-4 sm:p-5"}>
      <div className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: tone }}>
        {title}
      </div>
      <div className="mt-2.5 space-y-2">
        {items.map((it) => (
          <div key={it} className="flex gap-2 text-sm leading-snug text-ink-2">
            <Icon className="mt-0.5 size-4 shrink-0" style={{ color: tone }} aria-hidden />
            <span>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
