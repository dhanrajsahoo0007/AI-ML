import type { DiagramSpec } from "@/components/diagrams/types";

// Firewalls, told as the story of Brightpost's admin server (cloud/networking/firewalls).
// Step 1: the shop's three tiers in one private network under one wide rule: anything inside may reach anything,
// on any port. Step 2 (the failure step): a contractor starts an admin server with a public address and opens
// remote login (port 22) to anyone; a stranger's script gets in and, thanks to the wide rule, reaches the database
// port. Step 3: rules move onto each resource and name groups, not addresses; the open rule is deleted, so both
// red paths are refused. Step 4: the rules are stateful, so the database's reply returns with no rule of its own.
// Step 5: a second, coarser list guards the data subnet's edge and checks each direction separately. Step 6: the
// contractor reaches the admin server through an identity-checked remote access service; no port is open to the
// internet. Step 7: an organisation firewall policy, checked before every team's rules, forbids port 22 from
// anyone, so the step-2 rule could not be created again.
//
// Nodes never move between steps. The wide rule and the open port are never nodes, because a later step removes
// them: they live in the labels of edges that end at step 2 (`until: 2`).
//
// Layout: three columns.
//   Left (x 160), the shop's own path: shoppers, load balancer, app servers, orders database, subnet list.
//   Middle (x 385), the stranger's path and the rules: stranger's script, admin server, app rules, database rules.
//   Right (x 660), what the repair adds outside the network: contractor, remote access, org firewall policy.
// Rows (centres): 80 internet | 274 public subnet | 418 app subnet | 566 and 708 data subnet | 492 org policy.
// shoppers 160,80 | stranger 385,80 | contractor 660,80 | lb 160,274 | admin 385,274 | remote 660,274 |
// app 160,418 | apprules 385,418 | orgpol 660,492 | db 160,566 | dbrules 385,566 | nacl 160,708.
// The gaps between the internet zone and the network, and between the subnets, hold the edge labels.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 5 happen in
// the left and middle columns, so the free preview and the failure show without scrolling; only steps 6 and 7 need
// the right column. The canvas stays under 800 wide so labels stay readable in the 660 px article column.
//
// The admin server's path to the database drops into the gap between the public and app subnets (y 338), where its
// label sits beside the left column's, then runs down the gutter between the columns (x 280) and enters the database
// from the right, so it crosses no box. Vertical edges in the left column run at x 160, right of
// the network tab (which ends near x 100) and of the subnet labels (which end near x 140).
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle puts in them ("Cloud Load Balancing", "Identity-Aware Proxy",
// "Hierarchical policy", "Security admin rule").
const spec: DiagramSpec = {
  title: "Firewall rules: on the resource, at the subnet and above every team",
  width: 790,
  height: 790,
  steps: [
    { title: "One wide rule inside the network" },
    { title: "One rule open to the world" },
    { title: "Rules on each resource name groups" },
    { title: "Replies come back by themselves" },
    { title: "A second list at the subnet edge" },
    { title: "Remote access with no open port" },
    { title: "A policy above every team" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", x: 10, y: 20, w: 770, h: 112 },
    { id: "network", title: "Network", tone: "blue", kind: "vpc", x: 10, y: 186, w: 510, h: 590 },
    { id: "public", title: "Public subnet", tone: "blue", kind: "subnet", x: 24, y: 206, w: 482, h: 120 },
    { id: "appnet", title: "App subnet", tone: "teal", kind: "subnet", x: 24, y: 350, w: 482, h: 120 },
    { id: "datanet", title: "Data subnet", tone: "violet", kind: "subnet", x: 24, y: 494, w: 482, h: 266 },
  ],
  nodes: [
    // Step 1: the shop's own path, top to bottom.
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "400 orders a day",
      icon: "users",
      tone: "neutral",
      x: 160,
      y: 80,
      w: 176,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "the public front door",
      icon: "load-balancer",
      tone: "blue",
      x: 160,
      y: 274,
      w: 196,
      cloud: { aws: "aws-elb", gcp: "gcp-cloud-load-balancing", azure: "azure-app-gateway" },
    },
    {
      id: "app",
      label: "App servers",
      sub: "Brightpost shop",
      icon: "server",
      tone: "teal",
      x: 160,
      y: 418,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "PostgreSQL, managed",
      icon: "database",
      tone: "violet",
      x: 160,
      y: 566,
      w: 186,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },

    // Step 2: the failure.
    {
      id: "stranger",
      label: "Stranger's script",
      sub: "guesses passwords",
      icon: "robot",
      tone: "red",
      step: 2,
      x: 385,
      y: 80,
      w: 176,
    },
    {
      id: "admin",
      label: "Admin server",
      sub: "for maintenance",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 385,
      y: 274,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },

    // Step 3: a rule set on each resource, naming the group allowed to call it.
    {
      id: "apprules",
      label: "App rules",
      sub: "8080 from LB group",
      icon: "firewall",
      tone: "red",
      step: 3,
      x: 385,
      y: 418,
      w: 176,
      cloud: {
        aws: { label: "Security group" },
        gcp: { label: "Firewall rule" },
        azure: { label: "NSG + ASG" },
      },
    },
    {
      id: "dbrules",
      label: "Database rules",
      sub: "5432 from app group",
      icon: "firewall",
      tone: "red",
      step: 3,
      x: 385,
      y: 566,
      w: 176,
      cloud: {
        aws: { label: "Security group" },
        gcp: { label: "Firewall rule" },
        azure: { label: "NSG" },
      },
    },

    // Step 5: a second list at the subnet edge.
    {
      id: "nacl",
      label: "Subnet list",
      sub: "each way, no memory",
      icon: "policy",
      tone: "blue",
      step: 5,
      x: 160,
      y: 708,
      w: 176,
      cloud: {
        aws: { label: "Network ACL" },
        gcp: { label: "No subnet list" },
        azure: { label: "Subnet NSG" },
      },
    },

    // Step 6: a person reaches a private machine through an identity check, not an open port.
    {
      id: "contractor",
      label: "Contractor",
      sub: "works from home",
      icon: "users",
      tone: "neutral",
      step: 6,
      x: 660,
      y: 80,
      w: 176,
    },
    {
      id: "remote",
      label: "Remote access",
      sub: "checks who you are",
      icon: "lock",
      tone: "red",
      step: 6,
      x: 660,
      y: 274,
      w: 200,
      cloud: {
        aws: { id: "aws-systems-manager", label: "Session Manager" },
        gcp: "gcp-iap",
        azure: { label: "Azure Bastion" },
      },
    },

    // Step 7: rules set once for every network in the organisation.
    {
      id: "orgpol",
      label: "Org firewall policy",
      sub: "checked before teams",
      icon: "policy",
      tone: "orange",
      step: 7,
      x: 660,
      y: 492,
      w: 200,
      cloud: {
        aws: { label: "Firewall Manager" },
        gcp: { label: "Hierarchical policy" },
        azure: { label: "Security admin rule" },
      },
    },
  ],
  edges: [
    // Step 1: shoppers reach the load balancer on 443; inside, one wide rule lets anything reach anything.
    { from: "shoppers", to: "lb", label: "443, from anyone", packet: true, labelAt: 0.36 },
    { from: "lb", to: "app", label: "any port, from inside", packet: true, delay: 1.2, labelAt: 0.41, until: 2 },
    { from: "app", to: "db", label: "any port, from inside", packet: true, delay: 2.4, labelAt: 0.4, until: 2 },

    // Step 2: port 22 is open to the world; once in, the wide rule lets the script reach the database port.
    {
      from: "stranger",
      to: "admin",
      label: "22, open to anyone",
      tone: "red",
      packet: true,
      labelAt: 0.36,
      step: 2,
      until: 2,
    },
    {
      from: "admin",
      to: "db",
      label: "allowed: inside the network",
      tone: "red",
      packet: true,
      delay: 1.2,
      via: [
        [385, 338],
        [280, 338],
        [280, 566],
      ],
      labelAt: 0.21,
      step: 2,
      until: 2,
    },

    // Step 3: each tier accepts one port from one group. The open rule is gone, and so is the wide one.
    { from: "lb", to: "app", label: "8080, from LB group", packet: true, labelAt: 0.41, step: 3 },
    { from: "app", to: "db", label: "5432, from app group", packet: true, delay: 1.2, labelAt: 0.4, step: 3, until: 3 },
    {
      from: "stranger",
      to: "admin",
      label: "refused: no open port",
      tone: "red",
      dashed: true,
      labelAt: 0.36,
      step: 3,
    },
    {
      from: "admin",
      to: "db",
      label: "refused: not app group",
      tone: "red",
      dashed: true,
      via: [
        [385, 338],
        [280, 338],
        [280, 566],
      ],
      labelAt: 0.21,
      step: 3,
    },

    // Step 4: the database's rules remember the connection, so the reply goes back without a rule of its own.
    { from: "app", to: "db", label: "5432 + reply, no rule", bidirectional: true, packet: true, labelAt: 0.4, step: 4 },

    // Step 5: the subnet list reads every packet in and every packet out, with no memory.
    { from: "nacl", to: "db", label: "in and out, each a rule", dashed: true, flow: true, step: 5 },

    // Step 6: the contractor signs in with MFA; the service opens a session to the private admin server.
    { from: "contractor", to: "remote", label: "sign in + MFA", packet: true, step: 6 },
    { from: "remote", to: "admin", label: "session", packet: true, delay: 1.2, step: 6 },

    // Step 7: the org policy is checked first, and it refuses port 22 from anyone on every network.
    { from: "orgpol", to: "admin", label: "no 22 from anyone", tone: "orange", dashed: true, labelAt: 0.3, step: 7 },
  ],
};

export default spec;
