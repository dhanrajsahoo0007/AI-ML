import type { DiagramSpec } from "@/components/diagrams/types";

// Real-time connections on the cloud, told as Brightpost's live stock counter on a flash-sale evening
// (cloud/networking/realtime-on-the-cloud). Step 1: every sale page polls every 5 s, 320 requests a second, most of
// them answered "no change". Step 2: one open connection per shopper through the load balancer, kept alive with a
// ping every 25 s so the balancer's 60 s idle limit never fires. Step 3: a purchase on servers 3-4 is published on a
// shared pub/sub channel, so servers 1-2 can push it to the shoppers they hold. Step 4 (the failure step): a deploy
// drains servers 1-2; when the 60 s drain ends they cut 800 sockets in the same second, every browser reconnects at
// once and the reconnects exhaust the database. Step 5: servers close their sockets slowly during the drain and
// browsers wait a random 1-30 s, about 27 reconnects a second. Step 6: autoscaling follows the connection count,
// not processor use.
//
// Nodes never move. Each transport (polling, sockets, the cut, the spread-out return) is an edge with `until`, so a
// later step replaces it on the same line instead of drawing a second line beside it.
//
// Layout: two columns, so the whole figure fits the left 480 units a phone shows first.
//   Left (x 130), the path a shopper's connection takes: pages, load balancer, servers 1-2, pub/sub channel.
//   Right (x 390): autoscaler and connection count (step 6), servers 3-4, orders database.
// Rows (centres): 100 | 260 | 420 | 590.
// browsers 130,100 | autoscale 390,100 | lb 130,260 | metric 390,260 | s12 130,420 | s34 390,420 |
// pubsub 130,590 | db 390,590.
//
// Zone tabs sit on the top-left corner of each zone. Vertical edges run at x 130 and x 390, right of every tab.
// The diagonals (lb to servers 3-4, servers 3-4 to the channel) enter their zones well right of the tabs.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle puts in them ("Cloud Load Balancing", "Managed instance
// group", "Azure Managed Redis").
const spec: DiagramSpec = {
  title: "Live updates on the cloud: from polling to sockets that survive a deploy",
  width: 520,
  height: 680,
  steps: [
    { title: "Every page asks every 5 seconds" },
    { title: "One open connection per shopper" },
    { title: "A shared channel between servers" },
    { title: "A deploy cuts 800 sockets at once" },
    { title: "Close slowly, come back at random" },
    { title: "Scale on connections, not processor" },
  ],
  zones: [
    { id: "shoppers", title: "Shoppers", tone: "neutral", x: 10, y: 40, w: 240, h: 120 },
    { id: "edge", title: "Edge", tone: "blue", x: 10, y: 200, w: 240, h: 120 },
    { id: "ops", title: "Monitoring", tone: "orange", x: 275, y: 40, w: 235, h: 280 },
    { id: "app", title: "App servers", tone: "teal", x: 10, y: 360, w: 500, h: 120 },
    { id: "messages", title: "Messages", tone: "orange", x: 10, y: 530, w: 240, h: 120 },
    { id: "data", title: "Data", tone: "violet", x: 275, y: 530, w: 235, h: 120 },
  ],
  nodes: [
    // Step 1
    {
      id: "browsers",
      label: "Shoppers' pages",
      sub: "1,600 open",
      icon: "browser",
      tone: "neutral",
      x: 130,
      y: 100,
      w: 180,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "idle limit 60 s",
      icon: "load-balancer",
      tone: "blue",
      x: 130,
      y: 260,
      w: 204,
      cloud: {
        aws: { id: "aws-elb", label: "App Load Balancer" },
        gcp: "gcp-cloud-load-balancing",
        azure: "azure-app-gateway",
      },
    },
    {
      id: "s12",
      label: "App servers 1–2",
      sub: "half the shoppers",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 420,
      w: 190,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "s34",
      label: "App servers 3–4",
      sub: "half the shoppers",
      icon: "server",
      tone: "teal",
      x: 390,
      y: 420,
      w: 190,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "stock counts",
      icon: "database",
      tone: "violet",
      x: 390,
      y: 590,
      w: 190,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },

    // Step 3
    {
      id: "pubsub",
      label: "Pub/sub channel",
      sub: "every server listens",
      icon: "topic",
      tone: "orange",
      step: 3,
      x: 130,
      y: 590,
      w: 200,
      cloud: { aws: "aws-elasticache", gcp: "gcp-memorystore", azure: "azure-managed-redis" },
    },

    // Step 6
    {
      id: "metric",
      label: "Connection count",
      sub: "per server, not CPU",
      icon: "meter",
      tone: "orange",
      step: 6,
      x: 390,
      y: 260,
      w: 196,
      cloud: { aws: "aws-cloudwatch", gcp: "gcp-cloud-monitoring", azure: "azure-monitor" },
    },
    {
      id: "autoscale",
      label: "Autoscaler",
      sub: "adds a server",
      icon: "controller",
      tone: "orange",
      step: 6,
      x: 390,
      y: 100,
      w: 214,
      cloud: {
        aws: { label: "Auto Scaling group" },
        gcp: { label: "Managed instance group" },
        azure: { label: "VM Scale Sets" },
      },
    },
  ],
  edges: [
    // Step 1: polling. 1,600 pages ask every 5 s; most answers are "no change".
    { from: "browsers", to: "lb", label: "ask every 5 s", packet: true, until: 1 },
    { from: "lb", to: "s12", label: "160 a second", packet: true, delay: 0.6, until: 1 },
    { from: "lb", to: "s34", label: "160 a second", packet: true, delay: 0.6, until: 1 },
    { from: "s34", to: "db", label: "mostly: no change", packet: true, delay: 1.2, until: 1 },

    // Step 2: one socket per shopper, held open; a ping keeps it under the idle limit.
    {
      from: "browsers",
      to: "lb",
      label: "1 socket each, ping 25 s",
      bidirectional: true,
      flow: true,
      step: 2,
      until: 3,
    },
    { from: "lb", to: "s12", label: "800 sockets", bidirectional: true, flow: true, step: 2, until: 3 },
    { from: "lb", to: "s34", label: "800 sockets", bidirectional: true, flow: true, step: 2, until: 3 },

    // Step 3: a buy on servers 3-4 is published; every server hears it and pushes to the shoppers it holds.
    { from: "s34", to: "db", label: "buy: stock −1", packet: true, step: 3, until: 3 },
    { from: "s34", to: "pubsub", label: "publish: 13 left", packet: true, delay: 0.8, step: 3 },
    { from: "pubsub", to: "s12", label: "to every server", packet: true, delay: 1.6, step: 3 },

    // Step 4: the failure. The drain ends, 800 sockets are cut together and come back in the same second.
    { from: "s12", to: "lb", label: "drain ends: 800 cut", tone: "red", dashed: true, step: 4, until: 4 },
    { from: "browsers", to: "lb", label: "800 reconnect in 1 s", tone: "red", packet: true, step: 4, until: 4 },
    { from: "lb", to: "s34", label: "800 at once", tone: "red", packet: true, delay: 0.6, step: 4, until: 4 },
    { from: "s34", to: "db", label: "800 reads: pool full", tone: "red", packet: true, delay: 1.2, step: 4, until: 4 },

    // Step 5: close slowly, return at random. About 27 reconnects a second instead of 800 in one.
    { from: "browsers", to: "lb", label: "return after random 1–30 s", packet: true, step: 5 },
    { from: "lb", to: "s12", label: "drain: close over 60 s", dashed: true, flow: true, step: 5 },
    { from: "lb", to: "s34", label: "about 27 a second", packet: true, delay: 0.6, step: 5 },
    { from: "s34", to: "db", label: "resume from last count", packet: true, delay: 1.2, step: 5 },

    // Step 6: the autoscaler watches open connections per server, which processor use does not show.
    { from: "s34", to: "metric", label: "sockets per server", dashed: true, flow: true, step: 6 },
    { from: "metric", to: "autoscale", label: "over 600: add one", packet: true, step: 6 },
  ],
};

export default spec;
