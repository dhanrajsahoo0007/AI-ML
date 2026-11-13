import type { DiagramSpec } from "@/components/diagrams/types";

// Cost allocation, told as the month Brightpost's bill jumped 40% and nobody could say why
// (cloud/operations/finops-and-cost-tools).
// Step 1: the shop's servers, the orders database and the wholesale servers all meter into the provider's billing data,
// and the finance lead gets one number. Step 2 (the failure step): a GPU test cluster with no tags runs for 3 weeks;
// the bill is 40% higher and 35% of it has no owner. Step 3: a tag policy refuses untagged resources, and the billing
// data splits into a view per team plus an "unallocated" line that now holds the cluster's spend. Step 4: a daily
// export lands in a warehouse the team can query, which divides cost by orders. Step 5: budgets with a forecast and an
// anomaly monitor watch daily spend; the spike points at the cluster on day 1. Step 6: rightsizing advice reads usage
// and flags the wholesale servers, busy 10% of the time.
//
// Nodes never move between steps. The invoice edge to the finance lead changes label across steps, so it is three
// edges with `until`: "one invoice" (step 1), "+40%: whose?" (step 2), "split by team" (step 3 on).
//
// Layout: three columns.
//   Left (x 130), "what runs": shop servers, orders database, GPU test cluster, wholesale servers; rightsizing below.
//   Middle (x 390), "the provider's cost tools": finance lead on top, billing data, cost alerts; tag policy below.
//   Right (x 672), "what the team reads": three cost views on top, then the warehouse and cost per order.
// Rows (centres): 95 | 185-215 | 275 | 335 | 420-465 | 560-600.
// shopsrv 130,95 | db 130,215 | gpu 130,335 | wsrv 130,465 | rightsize 130,600 |
// finance 390,95 | billing 390,275 | alerts 390,420 | tagpol 390,575 |
// shopview 672,95 | wholeview 672,185 | unalloc 672,275 | warehouse 672,420 | unitcost 672,560.
//
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 and 2 use only the left and middle
// columns. The edges from the left column fan into the billing node, so only two of them carry labels ("metered" and
// "no tags"); the labels of the edges into the cluster sit at different heights in the left gutter (x 218-302).
// The fan out of the billing node to the right column puts its four labels in the right gutter (x 478-584) at
// y 185, 230, 275 and 376. The export edge bends at (530, 420) so it enters the warehouse zone from the side, below
// the zone's tab. The middle cost-tools zone is a subnet band, because the invoice edge leaves it through the top.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon; nodes are 176 wide
// for the longest toggle names ("Budgets + anomaly", "Compute Optimizer", "EC2 GPU instances", "Custom org policy").
const spec: DiagramSpec = {
  title: "Giving every line of the bill an owner",
  width: 795,
  height: 660,
  steps: [
    { title: "Every resource meters into one bill" },
    { title: "A GPU cluster nobody owns" },
    { title: "Tags and a tag policy name an owner" },
    { title: "A daily export and cost per order" },
    { title: "Alerts on the forecast and on spikes" },
    { title: "Rightsizing and storage advice" },
  ],
  zones: [
    { id: "accounts", title: "Workload accounts", tone: "teal", x: 10, y: 40, w: 240, h: 480 },
    { id: "advice", title: "Advice", tone: "orange", x: 10, y: 545, w: 240, h: 100 },
    { id: "people", title: "People", tone: "neutral", x: 295, y: 40, w: 190, h: 100 },
    { id: "tools", title: "Cost tools", tone: "orange", kind: "subnet", x: 295, y: 205, w: 190, h: 290 },
    { id: "guard", title: "Guardrail", tone: "red", x: 295, y: 520, w: 190, h: 125 },
    { id: "reports", title: "Cost reports", tone: "orange", x: 560, y: 40, w: 225, h: 275 },
    { id: "warehouse-zone", title: "Your warehouse", tone: "violet", x: 560, y: 345, w: 225, h: 300 },
  ],
  nodes: [
    // Step 1: what runs, and the one bill it adds up to.
    {
      id: "shopsrv",
      label: "Shop servers",
      sub: "team: shop",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 95,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "team: shop",
      icon: "database",
      tone: "violet",
      x: 130,
      y: 215,
      w: 176,
      cloud: { aws: "aws-rds", gcp: "gcp-cloud-sql", azure: { id: "azure-postgresql", label: "Azure PostgreSQL" } },
    },
    {
      id: "wsrv",
      label: "Wholesale servers",
      sub: "team: wholesale",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 465,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "billing",
      label: "Billing data",
      sub: "every meter, hourly",
      icon: "ledger",
      tone: "orange",
      x: 390,
      y: 275,
      w: 176,
      cloud: { aws: "aws-cost-explorer", gcp: "gcp-cloud-billing", azure: "azure-cost-management" },
    },
    {
      id: "finance",
      label: "Finance lead",
      sub: "reads the bill",
      icon: "users",
      tone: "neutral",
      x: 390,
      y: 95,
      w: 176,
    },

    // Step 2: the failure.
    {
      id: "gpu",
      label: "GPU test cluster",
      sub: "no tags, 3 weeks",
      icon: "gpu",
      tone: "red",
      step: 2,
      x: 130,
      y: 335,
      w: 176,
      cloud: {
        aws: { id: "aws-ec2", label: "EC2 GPU instances" },
        gcp: { id: "gcp-compute-engine", label: "GPU VMs" },
        azure: { id: "azure-vm", label: "GPU VMs" },
      },
    },

    // Step 3: tags, a policy that requires them, and one view per owner.
    {
      id: "tagpol",
      label: "Tag policy",
      sub: "env, team, owner",
      icon: "policy",
      tone: "red",
      step: 3,
      x: 390,
      y: 575,
      w: 176,
      cloud: {
        aws: { id: "aws-organizations", label: "SCP + tag policy" },
        gcp: { id: "gcp-resource-manager", label: "Custom org policy" },
        azure: "azure-policy",
      },
    },
    {
      id: "shopview",
      label: "Shop team",
      sub: "its own spend",
      icon: "chart",
      tone: "orange",
      step: 3,
      x: 672,
      y: 95,
      w: 176,
    },
    {
      id: "wholeview",
      label: "Wholesale team",
      sub: "its own spend",
      icon: "chart",
      tone: "orange",
      step: 3,
      x: 672,
      y: 185,
      w: 176,
    },
    {
      id: "unalloc",
      label: "Unallocated",
      sub: "35%, goal under 5%",
      icon: "flag",
      tone: "red",
      step: 3,
      x: 672,
      y: 275,
      w: 176,
    },

    // Step 4: the export and the unit cost.
    {
      id: "warehouse",
      label: "Cost warehouse",
      sub: "daily billing rows",
      icon: "database",
      tone: "violet",
      step: 4,
      x: 672,
      y: 420,
      w: 176,
      cloud: {
        aws: { id: "aws-athena", label: "Athena on CUR" },
        gcp: "gcp-bigquery",
        azure: { id: "azure-fabric", label: "Fabric" },
      },
    },
    {
      id: "unitcost",
      label: "Cost per order",
      sub: "cost ÷ orders",
      icon: "meter",
      tone: "violet",
      step: 4,
      x: 672,
      y: 560,
      w: 176,
    },

    // Step 5: alerts.
    {
      id: "alerts",
      label: "Cost alerts",
      sub: "forecast + spikes",
      icon: "bell",
      tone: "orange",
      step: 5,
      x: 390,
      y: 420,
      w: 176,
      cloud: {
        aws: { id: "aws-budgets", label: "Budgets + anomaly" },
        gcp: { id: "gcp-cloud-billing", label: "Budgets + anomaly" },
        azure: { id: "azure-cost-management", label: "Budgets + anomaly" },
      },
    },

    // Step 6: advice.
    {
      id: "rightsize",
      label: "Rightsizing",
      sub: "compute + storage",
      icon: "search",
      tone: "orange",
      step: 6,
      x: 130,
      y: 600,
      w: 176,
      cloud: {
        aws: "aws-compute-optimizer",
        gcp: { label: "Recommender" },
        azure: "azure-advisor",
      },
    },
  ],
  edges: [
    // Step 1: every resource meters into the billing data; the finance lead gets one number.
    { from: "shopsrv", to: "billing", label: "metered", packet: true },
    { from: "db", to: "billing", packet: true, delay: 0.4 },
    { from: "wsrv", to: "billing", packet: true, delay: 0.8 },
    { from: "billing", to: "finance", label: "one invoice", until: 1 },

    // Step 2: the cluster meters too, and the bill grows with no name on the growth.
    { from: "gpu", to: "billing", label: "no tags", tone: "red", packet: true, step: 2 },
    { from: "billing", to: "finance", label: "+40%: whose?", tone: "red", step: 2, until: 2 },

    // Step 3: the billing data splits by the team tag; what has no tag lands in "unallocated".
    { from: "billing", to: "finance", label: "split by team", step: 3 },
    { from: "billing", to: "shopview", label: "team: shop", packet: true, step: 3 },
    { from: "billing", to: "wholeview", label: "wholesale", packet: true, delay: 0.4, step: 3 },
    { from: "billing", to: "unalloc", label: "no team tag", tone: "red", dashed: true, step: 3 },
    { from: "tagpol", to: "gpu", label: "untagged: refused", tone: "red", dashed: true, labelAt: 0.35, step: 3 },

    // Step 4: a daily export of every billing row; the warehouse divides cost by orders.
    {
      from: "billing",
      to: "warehouse",
      label: "daily export",
      packet: true,
      via: [[530, 420]],
      labelAt: 0.55,
      step: 4,
    },
    { from: "warehouse", to: "unitcost", label: "÷ 12,000 orders", step: 4 },

    // Step 5: alerts read the daily spend; the spike points straight at the cluster.
    { from: "billing", to: "alerts", label: "daily spend", flow: true, dashed: true, step: 5 },
    { from: "alerts", to: "gpu", label: "spike, day 1", tone: "red", packet: true, step: 5 },

    // Step 6: rightsizing reads usage and flags the wholesale servers.
    { from: "rightsize", to: "wsrv", label: "busy 10%", dashed: true, step: 6 },
  ],
};

export default spec;
