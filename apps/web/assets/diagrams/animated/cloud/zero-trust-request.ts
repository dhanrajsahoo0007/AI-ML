import type { DiagramSpec } from "@/components/diagrams/types";

// Zero trust, told as the story of Brightpost's admin tool (cloud/resilience/zero-trust).
// Step 1: a support agent's laptop joins the office VPN, and anything on the VPN may open the admin tool, which has
// full access to the orders database. Step 2 (the failure step): a contractor's personal laptop with malware joins
// the same VPN; the malware opens the admin tool with no login and exports 18,000 customer records. Step 3: an
// identity-aware proxy replaces the VPN; each request needs a sign-in with MFA, and the proxy passes a signed
// identity to the tool. Step 4: the proxy asks a device check, and the unmanaged laptop is refused. Step 5: an
// access policy names which person, on which device, may open which app. Step 6: segmentation; the tool accepts
// only the proxy (a call from inside the old network is refused) and reaches the database with its own narrow
// identity. Step 7: every allow and deny is written to the audit log.
//
// Nodes never move between steps. Edges that a later step replaces end with `until`.
//
// Layout: three columns.
//   Left (x 130), "who and from what": contractor laptop, staff laptop.
//   Middle (x 390), "the path to the data": office VPN, identity-aware proxy, admin tool, orders database.
//   Right (x 672), "what the proxy asks": device check, sign-in, access policy, audit log.
// Rows (centres): 95 | 285 | 455 | 615.
// contractor 130,95 | vpn 390,95 | device 672,95 | staff 130,285 | proxy 390,285 | idp 672,285 |
// admin 390,455 | policy 672,455 | db 390,615 | log 672,615.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 use only the
// left and middle columns. The red step-2 edges run in a lane at x 455, beside the normal path at x 390.
//
// Zone tabs sit centred on a zone's top edge, from x + 16 to x + 16 + 8.2 per character + 28. The "Access" zone
// starts at y 175, so the contractor's refused edge (step 4) enters it through its left side at y 197, below the tab.
// The segmentation edge (step 6) runs down the gutter at x 260 and its label sits at y 365, above the
// "Admin segment" tab. The policy-to-log edge runs at x 730, right of the "Audit" tab.
// Nodes are sized for the longest name the Services toggle puts in them ("Verified Access policy", "Device trust
// provider", "Identity-Aware Proxy", "IAM Identity Center").
const spec: DiagramSpec = {
  title: "From a trusted VPN to checking every request",
  width: 795,
  height: 690,
  steps: [
    { title: "Inside the VPN means trusted" },
    { title: "A laptop with malware joins the VPN" },
    { title: "An identity-aware proxy replaces the VPN" },
    { title: "The device must pass a check" },
    { title: "One rule per app, on every request" },
    { title: "Small segments and a narrow identity" },
    { title: "Every decision is written down" },
  ],
  zones: [
    { id: "people", title: "People", tone: "neutral", x: 10, y: 40, w: 240, h: 305 },
    { id: "net", title: "Office network", tone: "blue", x: 270, y: 40, w: 240, h: 110 },
    { id: "access", title: "Access", tone: "red", x: 270, y: 175, w: 240, h: 170 },
    { id: "seg", title: "Admin segment", tone: "teal", x: 270, y: 395, w: 240, h: 115 },
    { id: "data", title: "Data", tone: "violet", x: 270, y: 555, w: 240, h: 120 },
    { id: "ctx", title: "Identity and context", tone: "red", x: 555, y: 40, w: 235, h: 470 },
    { id: "audit", title: "Audit", tone: "orange", x: 555, y: 555, w: 235, h: 120 },
  ],
  nodes: [
    // Step 1
    {
      id: "staff",
      label: "Staff laptop",
      sub: "support agent",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 285,
      w: 186,
    },
    {
      id: "vpn",
      label: "Office VPN",
      sub: "inside means trusted",
      icon: "tunnel",
      tone: "blue",
      x: 390,
      y: 95,
      w: 186,
    },
    {
      id: "admin",
      label: "Admin tool",
      sub: "orders and refunds",
      icon: "browser",
      tone: "teal",
      x: 390,
      y: 455,
      w: 186,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "90,000 customers",
      icon: "database",
      tone: "violet",
      x: 390,
      y: 615,
      w: 206,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },

    // Step 2: the failure
    {
      id: "contractor",
      label: "Contractor laptop",
      sub: "personal, has malware",
      icon: "robot",
      tone: "red",
      step: 2,
      x: 130,
      y: 95,
      w: 186,
    },

    // Step 3
    {
      id: "proxy",
      label: "Identity-aware proxy",
      sub: "checks every request",
      icon: "proxy",
      tone: "red",
      accent: true,
      step: 3,
      x: 390,
      y: 285,
      w: 206,
      cloud: {
        aws: "aws-verified-access",
        gcp: "gcp-iap",
        azure: { label: "Entra app proxy" },
      },
    },
    {
      id: "idp",
      label: "Sign-in + MFA",
      sub: "company directory",
      icon: "lock",
      tone: "red",
      step: 3,
      x: 672,
      y: 285,
      w: 210,
      cloud: {
        aws: { label: "IAM Identity Center" },
        gcp: { label: "Cloud Identity" },
        azure: "azure-entra-id",
      },
    },

    // Step 4
    {
      id: "device",
      label: "Device check",
      sub: "managed and patched?",
      icon: "cpu",
      tone: "red",
      step: 4,
      x: 672,
      y: 95,
      w: 210,
      cloud: {
        aws: { label: "Device trust provider" },
        gcp: { label: "Endpoint Verification" },
        azure: { label: "Intune compliance" },
      },
    },

    // Step 5
    {
      id: "policy",
      label: "Access policy",
      sub: "who, which app, which device",
      icon: "policy",
      tone: "red",
      step: 5,
      x: 672,
      y: 455,
      w: 210,
      cloud: {
        aws: { label: "Verified Access policy" },
        gcp: { label: "IAM + access levels" },
        azure: { label: "Conditional Access" },
      },
    },

    // Step 7
    {
      id: "log",
      label: "Audit log",
      sub: "every allow and deny",
      icon: "log",
      tone: "orange",
      step: 7,
      x: 672,
      y: 615,
      w: 210,
      cloud: {
        aws: { label: "Verified Access logs" },
        gcp: { id: "gcp-cloud-logging", label: "Cloud Audit Logs" },
        azure: { label: "Entra sign-in logs" },
      },
    },
  ],
  edges: [
    // Step 1: one sign-in at the VPN, then the network itself is the permission.
    { from: "staff", to: "vpn", label: "sign in once", packet: true, until: 2 },
    { from: "vpn", to: "admin", label: "any VPN address", packet: true, delay: 1.2, labelAt: 0.3, until: 2 },
    { from: "admin", to: "db", label: "full access", packet: true, delay: 2.4, labelAt: 0.35, until: 5 },

    // Step 2: the malware rides the contractor's VPN session in a lane beside the normal path.
    { from: "contractor", to: "vpn", label: "same VPN", tone: "red", packet: true, step: 2, until: 2 },
    {
      from: "vpn",
      to: "admin",
      label: "no login asked",
      tone: "red",
      packet: true,
      delay: 1.2,
      via: [
        [455, 124],
        [455, 426],
      ],
      labelAt: 0.65,
      step: 2,
      until: 2,
    },
    {
      from: "admin",
      to: "db",
      label: "18,000 records out",
      tone: "red",
      packet: true,
      delay: 2.4,
      via: [
        [455, 484],
        [455, 586],
      ],
      labelAt: 0.72,
      step: 2,
      until: 2,
    },

    // Step 3: the proxy is the only way in. It asks the directory who this is, then passes a signed identity on.
    { from: "staff", to: "proxy", label: "HTTPS", packet: true, step: 3 },
    { from: "proxy", to: "idp", label: "sign in", dashed: true, step: 3 },
    { from: "proxy", to: "admin", label: "signed identity", packet: true, delay: 1.2, step: 3 },

    // Step 4: the device must pass a check; the personal laptop is refused at the proxy.
    { from: "device", to: "proxy", label: "device healthy?", dashed: true, step: 4 },
    {
      from: "contractor",
      to: "proxy",
      label: "refused: unmanaged",
      tone: "red",
      dashed: true,
      labelAt: 0.35,
      step: 4,
    },

    // Step 5: the policy decides, per app and per request.
    { from: "policy", to: "proxy", label: "this app only", dashed: true, step: 5 },

    // Step 6: the tool accepts only the proxy, and reads the database with its own narrow identity.
    {
      from: "vpn",
      to: "admin",
      label: "refused: not via proxy",
      tone: "red",
      dashed: true,
      via: [
        [260, 95],
        [260, 455],
      ],
      labelAt: 0.71,
      step: 6,
    },
    { from: "admin", to: "db", label: "own identity, one order", packet: true, delay: 2.4, step: 6 },

    // Step 7: every decision and every query is written down.
    {
      from: "policy",
      to: "log",
      label: "every decision",
      dashed: true,
      flow: true,
      via: [
        [730, 484],
        [730, 586],
      ],
      step: 7,
    },
    { from: "db", to: "log", label: "queries", dashed: true, flow: true, step: 7 },
  ],
};

export default spec;
