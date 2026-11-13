import type { DiagramSpec } from "@/components/diagrams/types";

// Accounts, projects and governance, told as Brightpost's deleted database (cloud/fundamentals/accounts-and-governance).
// Step 1: the shop account holds everything, the live orders database and Asha's test copy side by side, and her
// clean-up script deletes the test copy. Step 2 (the failure step): the script matches by name, runs with the shop
// account's admin rights and deletes the live database too. Step 3: an organisation tree appears: three folders
// (non-production, production, security) and one account under each; the test copy now lives in its own account,
// so the same script is refused at the account wall. Step 4: a guardrail set on the root reaches every account below,
// and an admin of the shop account cannot switch it off. Step 5: tags label the shop's resources and a budget alert
// watches the whole organisation's spend. Step 6: a delete lock on the live database stops even an admin.
//
// Nodes never move between steps. Which account holds the test copy changes, so the "holds" edges from the shop
// account end at step 2 (`until: 2`) and a new edge from the test account starts at step 3.
//
// Layout: a tree drawn top to bottom, in three columns, one branch each.
//   Left (x 130), the non-production branch: guardrail on top, then folder, test account, test copy, script.
//   Middle (x 390), the production branch: organisation root, folder, shop account, workload group, orders database.
//   Right (x 672), the security branch and the tools that hang on the tree: budget, folder, audit account, tags, lock.
// Rows (centres): 90 | 200 | 315 | 425 | 550 | 705. The top row starts 30 units down so a NEW badge on the
// budget alert (top right) clears the figure's pause button.
// guardrail 130,90 | org 390,90 | budget 672,90 | nonprod 130,200 | prod 390,200 | security 672,200 |
// testacct 130,315 | shop 390,315 | audit 672,315 | rg 390,425 | tags 672,425 |
// testdb 130,550 | ordersdb 390,550 | lock 672,550 | script 130,705.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 use only the
// left and middle columns (shop account, both databases, the script), so the free preview and the failure are seen
// without scrolling. The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// No zones: a zone appears as soon as any node inside it does, and the test copy (step 1) would make a "test account"
// zone appear before the test account exists. The tree lines carry the containment instead.
// The "Workload group" level exists only on Azure (the resource group); AWS and Google Cloud say "No extra level".
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon.
// Nodes are sized for the longest name the Services toggle puts in them ("Organizational unit", "Deletion
// protection", "Organization root", "Organizations SCP", "Tenant root group").
const spec: DiagramSpec = {
  title: "From one account for everything to a tree with rules on it",
  width: 795,
  height: 750,
  steps: [
    { title: "One account holds the shop and the tests" },
    { title: "A test script deletes the live database" },
    { title: "Separate accounts under one organisation" },
    { title: "A guardrail at the root reaches every account" },
    { title: "Tags label owners; a budget alert watches spend" },
    { title: "A lock stops deletion, even by an admin" },
  ],
  zones: [],
  nodes: [
    // Step 1: one account, two databases, one script.
    {
      id: "shop",
      label: "Shop account",
      sub: "the live shop",
      icon: "package",
      tone: "neutral",
      x: 390,
      y: 315,
      w: 180,
      cloud: {
        aws: { label: "AWS account" },
        gcp: { id: "gcp-resource-manager", label: "Project" },
        azure: { label: "Subscription" },
      },
    },
    {
      id: "ordersdb",
      label: "Orders database",
      sub: "live orders",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 390,
      y: 550,
      cloud: { aws: "aws-rds", gcp: "gcp-cloud-sql", azure: { id: "azure-postgresql", label: "Azure Postgres" } },
    },
    {
      id: "testdb",
      label: "Test copy",
      sub: "for load tests",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 130,
      y: 550,
      cloud: { aws: "aws-rds", gcp: "gcp-cloud-sql", azure: { id: "azure-postgresql", label: "Azure Postgres" } },
    },
    {
      id: "script",
      label: "Clean-up script",
      sub: "Asha's, run by hand",
      icon: "workers",
      tone: "teal",
      x: 130,
      y: 705,
      w: 180,
    },

    // Step 3: the tree above the accounts.
    {
      id: "org",
      label: "Organisation",
      sub: "Brightpost root",
      icon: "tree",
      tone: "orange",
      step: 3,
      x: 390,
      y: 90,
      w: 190,
      cloud: {
        aws: { id: "aws-organizations", label: "Organization root" },
        gcp: { id: "gcp-resource-manager", label: "Organization" },
        azure: { id: "azure-management-groups", label: "Tenant root group" },
      },
    },
    {
      id: "nonprod",
      label: "Non-production",
      sub: "folder of accounts",
      icon: "folder",
      tone: "orange",
      step: 3,
      x: 130,
      y: 200,
      w: 200,
      cloud: {
        aws: { id: "aws-organizations", label: "Organizational unit" },
        gcp: { id: "gcp-resource-manager", label: "Folder" },
        azure: { id: "azure-management-groups", label: "Management group" },
      },
    },
    {
      id: "prod",
      label: "Production",
      sub: "folder of accounts",
      icon: "folder",
      tone: "orange",
      step: 3,
      x: 390,
      y: 200,
      w: 200,
      cloud: {
        aws: { id: "aws-organizations", label: "Organizational unit" },
        gcp: { id: "gcp-resource-manager", label: "Folder" },
        azure: { id: "azure-management-groups", label: "Management group" },
      },
    },
    {
      id: "security",
      label: "Security",
      sub: "folder of accounts",
      icon: "folder",
      tone: "orange",
      step: 3,
      x: 672,
      y: 200,
      w: 200,
      cloud: {
        aws: { id: "aws-organizations", label: "Organizational unit" },
        gcp: { id: "gcp-resource-manager", label: "Folder" },
        azure: { id: "azure-management-groups", label: "Management group" },
      },
    },
    {
      id: "testacct",
      label: "Test account",
      sub: "non-production",
      icon: "package",
      tone: "neutral",
      step: 3,
      x: 130,
      y: 315,
      w: 180,
      cloud: {
        aws: { label: "AWS account" },
        gcp: { id: "gcp-resource-manager", label: "Project" },
        azure: { label: "Subscription" },
      },
    },
    {
      id: "audit",
      label: "Audit account",
      sub: "log archive",
      icon: "package",
      tone: "neutral",
      step: 3,
      x: 672,
      y: 315,
      w: 180,
      cloud: {
        aws: { label: "AWS account" },
        gcp: { id: "gcp-resource-manager", label: "Project" },
        azure: { label: "Subscription" },
      },
    },
    {
      id: "rg",
      label: "Workload group",
      sub: "one app's parts",
      icon: "layers",
      tone: "neutral",
      step: 3,
      x: 390,
      y: 425,
      w: 180,
      cloud: {
        aws: { label: "No extra level" },
        gcp: { label: "No extra level" },
        azure: { label: "Resource group" },
      },
    },

    // Step 4: a guardrail on the root.
    {
      id: "guardrail",
      label: "Org guardrail",
      sub: "2 regions, no public",
      icon: "policy",
      tone: "orange",
      step: 4,
      x: 130,
      y: 90,
      w: 184,
      cloud: {
        aws: { id: "aws-organizations", label: "Organizations SCP" },
        gcp: { id: "gcp-resource-manager", label: "Org Policy" },
        azure: "azure-policy",
      },
    },

    // Step 5: tags and a budget alert.
    {
      id: "tags",
      label: "Tags",
      sub: "env, team, owner",
      icon: "ticket",
      tone: "orange",
      step: 5,
      x: 672,
      y: 425,
      w: 180,
      cloud: {
        aws: { label: "Resource tags" },
        gcp: { label: "Labels" },
        azure: { label: "Resource tags" },
      },
    },
    {
      id: "budget",
      label: "Budget alert",
      sub: "email at 80%",
      icon: "coin",
      tone: "orange",
      step: 5,
      x: 672,
      y: 90,
      w: 190,
      cloud: {
        aws: "aws-budgets",
        gcp: { id: "gcp-cloud-billing", label: "Billing budget" },
        azure: "azure-cost-management",
      },
    },

    // Step 6: a lock on the live database.
    {
      id: "lock",
      label: "Delete lock",
      sub: "stops even admins",
      icon: "lock",
      tone: "red",
      step: 6,
      x: 672,
      y: 550,
      w: 196,
      cloud: {
        aws: { label: "Deletion protection" },
        gcp: { label: "Deletion protection" },
        azure: { label: "Resource lock" },
      },
    },
  ],
  edges: [
    // Step 1: the shop account holds both databases; the script deletes the test copy.
    { from: "shop", to: "ordersdb", label: "holds", until: 2 },
    { from: "shop", to: "testdb", label: "holds", labelAt: 0.4, until: 2 },
    { from: "script", to: "testdb", label: "delete test copy", packet: true },

    // Step 2: the script's name filter also matches the live database, and the account lets it. This edge and the
    // refused one in step 3 bend at (300, 560) so the arrow meets the database's drawing, not its label.
    {
      from: "script",
      to: "ordersdb",
      label: "delete: allowed",
      tone: "red",
      packet: true,
      via: [[300, 560]],
      step: 2,
      until: 2,
    },

    // Step 3: the tree. Each account hangs under a folder, the folders under the root.
    { from: "org", to: "nonprod" },
    { from: "org", to: "prod" },
    { from: "org", to: "security" },
    { from: "nonprod", to: "testacct" },
    { from: "prod", to: "shop" },
    { from: "security", to: "audit" },
    { from: "testacct", to: "testdb", label: "holds" },
    { from: "shop", to: "rg" },
    { from: "rg", to: "ordersdb", label: "holds" },
    {
      from: "script",
      to: "ordersdb",
      label: "wall: refused",
      tone: "red",
      dashed: true,
      via: [[300, 560]],
      step: 3,
    },

    // Step 4: the guardrail is set on the root; the shop account's admin cannot switch it off. The refused edge
    // runs up the gutter between the left and middle columns (x 265) and turns in under the guardrail (y 142), so it
    // crosses no box; its label sits in the gap between the folder row and the account row.
    { from: "guardrail", to: "org", label: "set on", dashed: true },
    {
      from: "shop",
      to: "guardrail",
      label: "switch off: refused",
      tone: "red",
      dashed: true,
      via: [
        [265, 315],
        [265, 142],
        [150, 142],
      ],
      labelAt: 0.3,
      step: 4,
    },

    // Step 5: tags on the workload group; the budget watches the whole organisation.
    { from: "tags", to: "rg", label: "env: prod", dashed: true },
    { from: "budget", to: "org", label: "watches", dashed: true, flow: true },

    // Step 6: the lock sits on the live database.
    { from: "lock", to: "ordersdb", label: "no delete", tone: "red", dashed: true },
  ],
};

export default spec;
