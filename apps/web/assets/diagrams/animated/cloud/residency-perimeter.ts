import type { DiagramSpec } from "@/components/diagrams/types";

// Compliance and data residency, told as the story of Brightpost's analytics copy (cloud/resilience/
// compliance-and-residency). Step 1: customer data lives in two allowed regions (the writer near London, a read copy
// near Sydney), and card numbers stay with the payment provider. Step 2 (the failure step): a rented analytics tool,
// running in its vendor's account, copies each night's export to a third region. Step 3: a data perimeter refuses
// reads from identities outside Brightpost's organisation. Step 4: the tool now runs in Brightpost's own analytics
// account, under the region guardrail. Step 5: the data is encrypted with a key Brightpost holds. Step 6: the audit
// trail, an evidence collector and the provider's own reports give the auditor proof.
//
// Nodes never move between steps. The analytics store is one node: in steps 2 and 3 it is the vendor's copy, from
// step 4 the same tool inside Brightpost's own account. The edge labels say which (`until` retires the old edges).
//
// Layout: three columns, each one a question.
//   Left (x 128), "Brightpost's own data near London": app server, orders database, orders bucket, key service.
//   Middle (x 395), "where copies go": payment provider, Sydney read copy, analytics store, data perimeter.
//   Right (x 670), "rules and proof": region guardrail, audit trail, evidence collector, provider reports.
// Rows (centres): 100 | 255 | 418 | 580.
// app 128,100 | pay 395,100 | guardrail 670,100 | db 128,255 | replica 395,255 | trail 670,255 |
// bucket 128,418 | analytics 395,418 | evidence 670,418 | key 128,580 | perimeter 395,580 | reports 670,580.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 3 happen in
// the left and middle columns, so the free preview and the failure show without scrolling.
//
// Edges and zone tabs: a tab sits on a zone's top-left corner and is about 8.2 units per title character plus 28
// wide. Every vertical edge that enters a zone through its top does so right of that zone's tab: "Audit" and
// "Provider" are short titles for that reason, and the two middle zones that edges cross vertically are subnet
// zones (inline label, no tab). The guardrail's edge to the analytics store runs down the right gutter (x 528).
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle puts in them ("Security Command Center", "Private Link +
// Policy", "Service Trust Portal", "Resource locations").
const spec: DiagramSpec = {
  title: "Keeping customer data in its allowed regions",
  width: 800,
  height: 660,
  steps: [
    { title: "Customer data in two allowed regions" },
    { title: "A new tool copies addresses to a third region" },
    { title: "A data perimeter refuses the outside reader" },
    { title: "The tool moves under the region guardrail" },
    { title: "Data locked with a key Brightpost holds" },
    { title: "Evidence: the trail, the checks, the reports" },
  ],
  zones: [
    { id: "london", title: "London region", tone: "teal", x: 10, y: 40, w: 235, h: 600 },
    { id: "payzone", title: "Payment provider", tone: "neutral", x: 285, y: 40, w: 220, h: 110 },
    { id: "sydney", title: "Sydney region", tone: "teal", x: 285, y: 190, w: 220, h: 120 },
    { id: "analyticszone", title: "Analytics", tone: "neutral", kind: "subnet", x: 285, y: 350, w: 220, h: 120 },
    { id: "perimeterzone", title: "Perimeter", tone: "red", kind: "subnet", x: 285, y: 510, w: 220, h: 130 },
    { id: "org", title: "Organisation", tone: "orange", x: 546, y: 40, w: 248, h: 110 },
    { id: "audit", title: "Audit", tone: "blue", x: 546, y: 190, w: 248, h: 280 },
    { id: "provider", title: "Provider", tone: "neutral", x: 546, y: 510, w: 248, h: 130 },
  ],
  nodes: [
    // Step 1: where customer data lives today.
    {
      id: "app",
      label: "App server",
      sub: "the shop",
      icon: "server",
      tone: "teal",
      x: 128,
      y: 100,
      w: 186,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: { id: "azure-vm", label: "Azure VM" } },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "the only writer",
      icon: "database",
      tone: "violet",
      x: 128,
      y: 255,
      w: 186,
      cloud: { aws: "aws-rds", gcp: "gcp-cloud-sql", azure: { id: "azure-postgresql", label: "Azure PostgreSQL" } },
    },
    {
      id: "bucket",
      label: "Orders bucket",
      sub: "nightly exports",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 128,
      y: 418,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "pay",
      label: "Payment provider",
      sub: "holds card numbers",
      icon: "card",
      tone: "neutral",
      x: 395,
      y: 100,
      w: 186,
    },
    {
      id: "replica",
      label: "Read copy",
      sub: "for Australia",
      icon: "database",
      tone: "violet",
      x: 395,
      y: 255,
      w: 186,
      cloud: {
        aws: { id: "aws-rds", label: "RDS read replica" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL replica" },
        azure: { id: "azure-postgresql", label: "Read replica" },
      },
    },

    // Step 2: the failure.
    {
      id: "analytics",
      label: "Analytics store",
      sub: "the new tool's data",
      icon: "chart",
      tone: "violet",
      step: 2,
      x: 395,
      y: 418,
      w: 186,
      cloud: { aws: "aws-redshift", gcp: "gcp-bigquery", azure: "azure-fabric" },
    },

    // Step 3
    {
      id: "perimeter",
      label: "Data perimeter",
      sub: "our accounts only",
      icon: "shield",
      tone: "red",
      step: 3,
      x: 395,
      y: 580,
      w: 206,
      cloud: {
        aws: { id: "aws-organizations", label: "Perimeter policies" },
        gcp: "gcp-vpc-service-controls",
        azure: { id: "azure-private-link", label: "Private Link + Policy" },
      },
    },

    // Step 4
    {
      id: "guardrail",
      label: "Region guardrail",
      sub: "London, Sydney only",
      icon: "policy",
      tone: "orange",
      step: 4,
      x: 670,
      y: 100,
      w: 196,
      cloud: {
        aws: { id: "aws-organizations", label: "SCP region deny" },
        gcp: { id: "gcp-resource-manager", label: "Resource locations" },
        azure: { id: "azure-policy", label: "Allowed locations" },
      },
    },

    // Step 5
    {
      id: "key",
      label: "Key service",
      sub: "Brightpost's own key",
      icon: "key",
      tone: "red",
      step: 5,
      x: 128,
      y: 580,
      w: 186,
      cloud: {
        aws: { id: "aws-kms", label: "AWS KMS" },
        gcp: "gcp-kms",
        azure: { id: "azure-key-vault", label: "Key Vault" },
      },
    },

    // Step 6
    {
      id: "trail",
      label: "Audit trail",
      sub: "every call, kept",
      icon: "log",
      tone: "orange",
      step: 6,
      x: 670,
      y: 255,
      w: 196,
      cloud: {
        aws: "aws-cloudtrail",
        gcp: { id: "gcp-cloud-logging", label: "Cloud Audit Logs" },
        azure: { id: "azure-monitor", label: "Activity log" },
      },
    },
    {
      id: "evidence",
      label: "Evidence collector",
      sub: "checks every day",
      icon: "file",
      tone: "orange",
      step: 6,
      x: 670,
      y: 418,
      w: 232,
      cloud: {
        aws: { label: "Audit Manager" },
        gcp: { id: "gcp-scc", label: "Security Command Center" },
        azure: { id: "azure-purview", label: "Compliance Manager" },
      },
    },
    {
      id: "reports",
      label: "Provider reports",
      sub: "the provider's audits",
      icon: "certificate",
      tone: "blue",
      step: 6,
      x: 670,
      y: 580,
      w: 206,
      cloud: {
        aws: { label: "AWS Artifact" },
        gcp: { label: "Compliance Reports" },
        azure: { label: "Service Trust Portal" },
      },
    },
  ],
  edges: [
    // Step 1: card numbers never reach Brightpost; orders are written near London and copied to Sydney.
    { from: "pay", to: "app", label: "token only", packet: true },
    { from: "app", to: "db", label: "orders", packet: true, delay: 0.8 },
    { from: "db", to: "bucket", label: "nightly export", dashed: true, flow: true },
    { from: "db", to: "replica", label: "copy, 1 s", packet: true, delay: 1.4 },

    // Step 2: the vendor's tool copies each export to a third region.
    { from: "bucket", to: "analytics", label: "to a 3rd region", tone: "red", packet: true, step: 2, until: 2 },

    // Step 3: the perimeter refuses the vendor's identity, which is outside Brightpost's organisation.
    { from: "bucket", to: "analytics", label: "vendor: refused", tone: "red", dashed: true, step: 3, until: 3 },
    { from: "perimeter", to: "analytics", label: "checks each copy", dashed: true, step: 3 },

    // Step 4: the tool runs in Brightpost's own analytics account; the guardrail allows two regions only.
    // The guardrail's edge runs left, then down the right gutter (x 528), and enters the store from the right.
    {
      from: "guardrail",
      to: "analytics",
      label: "2 regions only",
      tone: "orange",
      dashed: true,
      via: [
        [528, 100],
        [528, 418],
      ],
      labelAt: 0.72,
      step: 4,
    },
    { from: "bucket", to: "analytics", label: "copy in London", packet: true, step: 4 },

    // Step 5: the bucket's data is encrypted with a key that Brightpost controls.
    { from: "key", to: "bucket", label: "our key", dashed: true, step: 5 },

    // Step 6: refusals and changes land in the audit trail; the collector turns them into evidence.
    { from: "guardrail", to: "trail", label: "refusals", dashed: true, flow: true, labelAt: 0.3, step: 6 },
    { from: "trail", to: "evidence", label: "every call", dashed: true, flow: true, step: 6 },
    { from: "reports", to: "evidence", label: "their part", dashed: true, labelAt: 0.68, step: 6 },
  ],
};

export default spec;
