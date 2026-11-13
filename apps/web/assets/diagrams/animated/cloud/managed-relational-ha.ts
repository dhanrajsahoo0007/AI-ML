import type { DiagramSpec } from "@/components/diagrams/types";

// A managed relational database and the copies around it, told as Brightpost's double-payment sale day
// (cloud/data/managed-relational).
// Step 1: the shop app sends every query to the managed PostgreSQL primary in zone A. The provider keeps a
// synchronous standby in zone B and takes the 03:00 backup plus a log of every change. Step 2: a read replica in
// zone C, built for the finance lead's monthly report, now also takes the order page. Step 3 (the only failure step):
// on sale day the replica falls up to 40 s behind, shoppers who have just paid read "payment pending" and about 130
// pay twice. Step 4: reads that must show the shopper's own write go to the primary, and an alarm watches the lag.
// Step 5: a managed connection proxy shares the database's connections between the app servers and the resize
// function. Step 6: in a failover drill the standby becomes the primary and the proxy re-points to it.
//
// Nodes never move and never disappear. The app-to-primary and primary-to-replica edges change their labels from
// step to step, so each version ends with `until`; the step-4 versions stay in the full view (the app-to-primary
// one ends at step 4, when the proxy takes its place).
//
// Layout: three columns (x 125 | 400 | 680) and four rows (y 90 | 245 | 400 | 550).
//   Left, the shop side: shoppers 125,90 | app 125,245 | read replica 125,400 | paid twice 125,550.
//   Middle, the database: backups 400,90 | primary 400,245 | standby 400,400 | lag alarm 400,550.
//   Right, added later: connection proxy 680,245 | resize function 680,400.
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 4 (the free
// preview, the failure and its fix) use only the left and middle columns; only the proxy step and the failover need
// the right column. The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// Edge routes: the replica sits left of the standby, so the asynchronous copy runs diagonally from the primary's
// bottom to the replica's top through the gap between the rows (label at y 322), and the synchronous copy is a short
// vertical edge. The lag edge leaves the replica to the right, runs down the gutter between the columns (x 265) and
// enters the alarm from the left. The app reaches the proxy over the top of the primary (y 172, between the backups
// zone and zone A). The failover edge runs from the proxy's bottom to the standby's top, between the zones.
// Zone tabs: vertical edges at x 125, 400 and 680 enter zones right of their tabs. The two bottom zones use the subnet
// kind (inline label, no tab). The backups edge has no label, because the app-to-proxy route crosses it.
// Text room: a label takes about 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle shows: "Virtual Machines" (app, w 170), "Multi-AZ standby"
// (w 170), "Cloud SQL replica" (w 176), "Built-in PgBouncer" (w 184), "Cloud Run functions" (w 190), "Cloud
// Monitoring" (w 170). The gap between the app and the primary (210 to 316) fits a 14-character pill.
const spec: DiagramSpec = {
  title: "A managed database: standby, read replica, proxy and failover",
  width: 795,
  height: 620,
  steps: [
    { title: "One managed primary, a standby and backups" },
    { title: "A read replica takes the order page" },
    { title: "Sale day: the replica falls 40 s behind" },
    { title: "Fresh reads go to the primary; lag is watched" },
    { title: "A proxy shares the connections" },
    { title: "Failover: the standby takes over" },
  ],
  zones: [
    { id: "people", title: "Shoppers", tone: "neutral", x: 10, y: 20, w: 240, h: 140 },
    { id: "shop", title: "Shop", tone: "teal", x: 10, y: 190, w: 240, h: 110 },
    { id: "zone-c", title: "Zone C", tone: "violet", x: 10, y: 345, w: 240, h: 110 },
    { id: "sale", title: "Sale day", tone: "neutral", kind: "subnet", x: 10, y: 495, w: 240, h: 110 },
    { id: "backup-zone", title: "Backups", tone: "violet", x: 290, y: 20, w: 220, h: 140 },
    { id: "zone-a", title: "Zone A", tone: "violet", x: 290, y: 190, w: 220, h: 110 },
    { id: "zone-b", title: "Zone B", tone: "violet", x: 290, y: 345, w: 220, h: 110 },
    { id: "monitoring", title: "Monitoring", tone: "orange", kind: "subnet", x: 290, y: 495, w: 220, h: 110 },
    { id: "connections", title: "Connections", tone: "blue", x: 560, y: 190, w: 225, h: 110 },
    { id: "functions", title: "Functions", tone: "teal", x: 560, y: 345, w: 225, h: 110 },
  ],
  nodes: [
    // Step 1
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "2,000 at 9 a.m.",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 125,
      y: 90,
    },
    {
      id: "app",
      label: "Shop app",
      sub: "2 to 10 servers",
      icon: "server",
      tone: "teal",
      x: 125,
      y: 245,
      w: 170,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "primary",
      label: "Orders primary",
      sub: "PostgreSQL, 4 CPUs",
      icon: "database",
      tone: "violet",
      accent: true,
      x: 400,
      y: 245,
      w: 168,
      cloud: {
        aws: { id: "aws-rds", label: "RDS primary" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL" },
        azure: { id: "azure-postgresql", label: "Flexible server" },
      },
    },
    {
      id: "standby",
      label: "Standby",
      sub: "takes over, no reads",
      icon: "database",
      tone: "violet",
      x: 400,
      y: 400,
      w: 170,
      cloud: {
        aws: { id: "aws-rds", label: "Multi-AZ standby" },
        gcp: { id: "gcp-cloud-sql", label: "HA standby" },
        azure: { id: "azure-postgresql", label: "HA standby" },
      },
    },
    {
      id: "backups",
      label: "Backups",
      sub: "03:00 + change log",
      icon: "snapshot",
      tone: "violet",
      variant: "glyph",
      x: 400,
      y: 90,
      cloud: {
        aws: { id: "aws-rds", label: "Automated backups" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL backups" },
        azure: { id: "azure-postgresql", label: "Server backups" },
      },
    },

    // Step 2
    {
      id: "replica",
      label: "Read replica",
      sub: "2 CPUs, reports",
      icon: "database",
      tone: "violet",
      step: 2,
      x: 125,
      y: 400,
      w: 176,
      cloud: {
        aws: { id: "aws-rds", label: "RDS read replica" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL replica" },
        azure: { id: "azure-postgresql", label: "Read replica" },
      },
    },

    // Step 3: the failure
    {
      id: "paid",
      label: "Paid twice",
      sub: "about 130 shoppers",
      icon: "card",
      tone: "red",
      step: 3,
      x: 125,
      y: 550,
      w: 176,
    },

    // Step 4
    {
      id: "alarm",
      label: "Lag alarm",
      sub: "pages Asha at 10 s",
      icon: "meter",
      tone: "orange",
      step: 4,
      x: 400,
      y: 550,
      w: 170,
      cloud: { aws: "aws-cloudwatch", gcp: "gcp-cloud-monitoring", azure: "azure-monitor" },
    },

    // Step 5
    {
      id: "proxy",
      label: "Connection proxy",
      sub: "shares 150 of 200",
      icon: "proxy",
      tone: "blue",
      step: 5,
      x: 680,
      y: 245,
      w: 184,
      cloud: {
        aws: { id: "aws-rds", label: "RDS Proxy" },
        gcp: { label: "PgBouncer you run" },
        azure: { id: "azure-postgresql", label: "Built-in PgBouncer" },
      },
    },
    {
      id: "fn",
      label: "Resize function",
      sub: "pool of 20",
      icon: "function",
      tone: "teal",
      step: 5,
      x: 680,
      y: 400,
      w: 190,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },
  ],
  edges: [
    // Step 1: one primary does every job. The provider copies each write to the standby and backs it all up.
    { from: "shoppers", to: "app", label: "buy, check", packet: true },
    { from: "app", to: "primary", label: "all queries", packet: true, delay: 0.8, until: 1 },
    { from: "primary", to: "standby", label: "sync copy", packet: true, delay: 1.6 },
    { from: "primary", to: "backups", dashed: true, flow: true },

    // Step 2: the replica copies changes without making the primary wait, and takes the order page.
    { from: "app", to: "primary", label: "writes", packet: true, delay: 0.8, step: 2, until: 3 },
    { from: "primary", to: "replica", label: "async copy", dashed: true, flow: true, step: 2, until: 2 },
    { from: "app", to: "replica", label: "order page", packet: true, delay: 1.2, step: 2, until: 3 },

    // Step 3: the replica trails by up to 40 s; a shopper who has just paid reads "pending" and pays again.
    { from: "primary", to: "replica", label: "40 s behind", tone: "red", dashed: true, flow: true, step: 3, until: 3 },
    { from: "replica", to: "paid", label: "says 'pending'", tone: "red", packet: true, step: 3, until: 3 },

    // Step 4: a shopper's reads for 60 s after a write go to the primary; older pages stay on the replica.
    { from: "app", to: "primary", label: "writes, fresh", packet: true, delay: 0.8, step: 4, until: 4 },
    { from: "primary", to: "replica", label: "async copy", dashed: true, flow: true, step: 4 },
    { from: "app", to: "replica", label: "history pages", packet: true, delay: 1.2, step: 4 },
    {
      from: "replica",
      to: "alarm",
      label: "lag > 10 s",
      dashed: true,
      via: [
        [265, 400],
        [265, 550],
      ],
      labelAt: 0.5,
      step: 4,
    },

    // Step 5: the app and the function connect to the proxy, which lends out a fixed set of database connections.
    {
      from: "app",
      to: "proxy",
      label: "writes, fresh",
      packet: true,
      via: [
        [200, 172],
        [680, 172],
      ],
      labelAt: 0.74,
      step: 5,
    },
    { from: "fn", to: "proxy", label: "20 connections", packet: true, delay: 0.6, step: 5 },
    { from: "proxy", to: "primary", label: "pooled", packet: true, delay: 1.4, step: 5 },

    // Step 6: in a drill the standby becomes the primary; the proxy reconnects to it and the app keeps its sockets.
    { from: "proxy", to: "standby", label: "after failover", tone: "green", dashed: true, packet: true, step: 6 },
  ],
};

export default spec;
