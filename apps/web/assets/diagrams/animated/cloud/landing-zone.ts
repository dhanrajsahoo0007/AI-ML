import type { DiagramSpec } from "@/components/diagrams/types";

// Landing zones, told as Brightpost's second team and its hand-made account (cloud/fundamentals/landing-zones).
// Step 1: the tree Brightpost built by hand for one team: a root with a guardrail, single sign-on, three folders
// (non-production, production, security) and one account in each; the shop account sends its logs to the archive.
// Step 2 (the failure step): the wholesale team's account was created by hand outside the tree. Its bucket is public,
// anyone can download the trade orders, and no logs reach the archive. Step 3: the account joins the production
// folder, so the root guardrail reaches it and the public read is refused. Step 4: a security tooling account
// collects findings, and the wholesale account's audit trail flows to the archive. Step 5: a shared network hub with
// one private link to the printing partner. Step 6: account vending creates the wholesale test account in the
// non-production folder, with the same baseline as every other account.
//
// Nodes never move between steps. The hand-made account is never moved: it is drawn below the shop account with no
// tree edge in step 2, and the edge from the production folder appears in step 3. Edges a later step replaces end
// with `until`.
//
// Layout: a tree drawn top to bottom in three columns.
//   Left (x 130): guardrail, non-production folder, test account, wholesale test, account vending, the stranger.
//   Middle (x 375): organisation root, production folder, shop account, wholesale account, wholesale bucket.
//   Right (x 665): single sign-on, security folder, log archive, security tooling, network hub, printing partner.
// Rows (centres): 90 | 205 | 320 | 435 | 550 | 665. The top row starts 30 units down so a NEW badge on the top
// right node clears the figure's pause button.
//
// A folder with two accounts stacked in one column cannot reach the lower one with a straight line, so those tree
// edges run down a gutter: production to wholesale between the left and middle columns (x 255), security to
// tooling outside the right column (x 788), non-production to wholesale test outside the left column (x 15).
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 3 tell the
// story with the left and middle columns (guardrail, root, folders, accounts, bucket, stranger), so the free preview
// and the failure are seen without scrolling. The canvas stays under 800 wide so labels stay readable.
//
// No zones: a zone appears as soon as any node inside it does, and the hand-made account must sit outside the tree
// in step 2 and inside it from step 3 without moving. The tree lines carry the containment instead.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon.
// Nodes are sized for the longest name the Services toggle puts in them ("Management subscription",
// "Security Command Center", "Organizational unit", "Subscription vending", "IAM Identity Center").
const ACCOUNT = {
  aws: { label: "AWS account" },
  gcp: { id: "gcp-resource-manager", label: "Project" },
  azure: { label: "Subscription" },
};
const FOLDER = {
  aws: { id: "aws-organizations", label: "Organizational unit" },
  gcp: { id: "gcp-resource-manager", label: "Folder" },
  azure: { id: "azure-management-groups", label: "Management group" },
};

const spec: DiagramSpec = {
  title: "From a tree built by hand to a landing zone that vends accounts",
  width: 795,
  height: 745,
  steps: [
    { title: "The tree Brightpost built by hand" },
    { title: "A second team's account, made outside the tree" },
    { title: "The account joins the tree; the guardrail reaches it" },
    { title: "Logs and findings from every account" },
    { title: "One network hub for every account" },
    { title: "Every new account comes from vending" },
  ],
  zones: [],
  nodes: [
    // Step 1: the tree as Brightpost built it for one team.
    {
      id: "guardrail",
      label: "Org guardrail",
      sub: "no public buckets",
      icon: "policy",
      tone: "orange",
      x: 130,
      y: 90,
      w: 200,
      cloud: {
        aws: { id: "aws-organizations", label: "Organizations SCP" },
        gcp: { id: "gcp-resource-manager", label: "Org Policy" },
        azure: "azure-policy",
      },
    },
    {
      id: "org",
      label: "Organisation",
      sub: "Brightpost root",
      icon: "tree",
      tone: "orange",
      x: 375,
      y: 90,
      w: 190,
      cloud: {
        aws: { id: "aws-organizations", label: "Organization root" },
        gcp: { id: "gcp-resource-manager", label: "Organization" },
        azure: { id: "azure-management-groups", label: "Tenant root group" },
      },
    },
    {
      id: "sso",
      label: "Single sign-on",
      sub: "password + MFA",
      icon: "lock",
      tone: "red",
      x: 665,
      y: 90,
      w: 230,
      cloud: {
        aws: { label: "IAM Identity Center" },
        gcp: { label: "Cloud Identity" },
        azure: "azure-entra-id",
      },
    },
    {
      id: "nonprod",
      label: "Non-production",
      sub: "folder",
      icon: "folder",
      tone: "orange",
      x: 130,
      y: 205,
      w: 200,
      cloud: FOLDER,
    },
    {
      id: "prod",
      label: "Production",
      sub: "folder",
      icon: "folder",
      tone: "orange",
      x: 375,
      y: 205,
      w: 196,
      cloud: FOLDER,
    },
    {
      id: "security",
      label: "Security",
      sub: "folder",
      icon: "folder",
      tone: "orange",
      x: 665,
      y: 205,
      w: 230,
      cloud: FOLDER,
    },
    {
      id: "test",
      label: "Test account",
      sub: "shop team, testing",
      icon: "package",
      tone: "neutral",
      x: 130,
      y: 320,
      w: 200,
      cloud: ACCOUNT,
    },
    {
      id: "shop",
      label: "Shop account",
      sub: "shop team, live",
      icon: "package",
      tone: "neutral",
      x: 375,
      y: 320,
      w: 190,
      cloud: ACCOUNT,
    },
    {
      id: "archive",
      label: "Log archive",
      sub: "the audit account",
      icon: "log",
      tone: "orange",
      x: 665,
      y: 320,
      w: 230,
      cloud: {
        aws: { label: "Log Archive account" },
        gcp: { label: "Logging project" },
        azure: { label: "Management subscription" },
      },
    },

    // Step 2: the failure. An account made by hand, outside the tree, with a public bucket.
    {
      id: "wholesale",
      label: "Wholesale account",
      sub: "made by hand",
      icon: "package",
      tone: "neutral",
      step: 2,
      x: 375,
      y: 435,
      w: 190,
      cloud: ACCOUNT,
    },
    {
      id: "bucket",
      label: "Wholesale bucket",
      sub: "300 shops' orders",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 375,
      y: 665,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "stranger",
      label: "Anyone online",
      sub: "no sign-in needed",
      icon: "robot",
      tone: "red",
      step: 2,
      x: 130,
      y: 665,
      w: 200,
    },

    // Step 4: a security tooling account that sees every account.
    {
      id: "tooling",
      label: "Security tooling",
      sub: "findings, every account",
      icon: "radar",
      tone: "red",
      step: 4,
      x: 665,
      y: 435,
      w: 230,
      cloud: { aws: "aws-security-hub", gcp: "gcp-scc", azure: "azure-defender" },
    },

    // Step 5: one network hub, one private link out.
    {
      id: "hub",
      label: "Network hub",
      sub: "one shared router",
      icon: "router",
      tone: "blue",
      step: 5,
      x: 665,
      y: 550,
      w: 230,
      cloud: {
        aws: "aws-transit-gateway",
        gcp: { id: "gcp-vpc", label: "Shared VPC" },
        azure: { id: "azure-vnet", label: "Hub virtual network" },
      },
    },
    {
      id: "partner",
      label: "Printing partner",
      sub: "its own factory",
      icon: "building",
      tone: "neutral",
      step: 5,
      x: 665,
      y: 665,
      w: 230,
    },

    // Step 6: account vending makes the next account the same way every time.
    {
      id: "wtest",
      label: "Wholesale test",
      sub: "vended in 20 minutes",
      icon: "package",
      tone: "neutral",
      step: 6,
      x: 130,
      y: 435,
      w: 200,
      cloud: ACCOUNT,
    },
    {
      id: "vending",
      label: "Account vending",
      sub: "same baseline each time",
      icon: "pipeline",
      tone: "orange",
      step: 6,
      x: 130,
      y: 550,
      w: 200,
      cloud: {
        aws: "aws-control-tower",
        gcp: { label: "Project factory" },
        azure: { label: "Subscription vending" },
      },
    },
  ],
  edges: [
    // Step 1: the tree, the guardrail on its root, one sign-in, and the shop's logs going to the archive.
    { from: "guardrail", to: "org", label: "set on", dashed: true },
    { from: "sso", to: "org", label: "sign-in", packet: true },
    { from: "org", to: "nonprod" },
    { from: "org", to: "prod" },
    { from: "org", to: "security" },
    { from: "nonprod", to: "test" },
    { from: "prod", to: "shop" },
    { from: "security", to: "archive" },
    { from: "shop", to: "archive", label: "logs", dashed: true, flow: true },

    // Step 2: no tree edge reaches the wholesale account. Its bucket is public and sends nothing to the archive.
    { from: "wholesale", to: "bucket", label: "public", tone: "red", until: 2 },
    { from: "stranger", to: "bucket", label: "downloads", tone: "red", packet: true, until: 2 },
    { from: "wholesale", to: "archive", label: "no logs", tone: "red", dashed: true, until: 3 },

    // Step 3: the production folder adopts the account (down the gutter at x 255), so the root guardrail reaches it.
    {
      from: "prod",
      to: "wholesale",
      label: "joins the tree",
      via: [
        [255, 205],
        [255, 435],
      ],
      labelAt: 0.67,
      step: 3,
    },
    { from: "wholesale", to: "bucket", label: "private", step: 3 },
    { from: "stranger", to: "bucket", label: "public: refused", tone: "red", dashed: true, step: 3 },

    // Step 4: the security folder holds the tooling account (down the right gutter); logs and findings flow in.
    {
      from: "security",
      to: "tooling",
      via: [
        [788, 205],
        [788, 435],
      ],
    },
    { from: "wholesale", to: "archive", label: "audit logs", dashed: true, flow: true, step: 4 },
    { from: "wholesale", to: "tooling", label: "findings", dashed: true, flow: true, step: 4 },

    // Step 5: the wholesale network attaches to the hub; the hub carries the one link to the printing partner.
    { from: "wholesale", to: "hub", label: "attached" },
    { from: "hub", to: "partner", label: "one link", packet: true },

    // Step 6: vending creates the wholesale test account inside the non-production folder (down the left gutter).
    {
      from: "nonprod",
      to: "wtest",
      via: [
        [15, 205],
        [15, 435],
      ],
    },
    { from: "vending", to: "wtest", label: "creates", packet: true },
  ],
};

export default spec;
