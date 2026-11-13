import type { DiagramSpec } from "@/components/diagrams/types";

// A managed connection service for Brightpost's live stock counter (cloud/networking/realtime-on-the-cloud).
// Step 1: the service holds all 1,600 sockets and answers the pings; no server of Brightpost's holds one. Step 2:
// when a page connects, the service calls a short-lived function with the connection id (7f3), and the function
// saves "7f3 watches poster 18" in a connection list. Step 3: when stock changes, the function looks up who
// watches that poster and asks the service to send the new count to connection 7f3. A deploy of the function
// cuts no socket, because the function never held one.
//
// Nodes never move. The step 2 call into the function is replaced in step 3 by a two-way edge on the same line
// (`until: 2`), so the full view shows one line: events in, sends out.
//
// Layout: two columns that fit the left 480 units a phone shows first.
//   Left (x 140), the path of one connection: pages, the managed service, your function.
//   Right (x 410), what the function reads and writes: the connection list and the orders database.
// Rows (centres): 100 | 270 | 440.
// browsers 140,100 | service 140,270 | list 410,270 | fn 140,440 | db 410,440.
//
// Zone tabs sit on the top-left corner of each zone; the vertical edges run at x 140, right of every tab. The
// diagonal from the function to the list enters the data zone through its left side, below the tab.
// The service has no Google Cloud name: Google Cloud has no managed service of this kind, so that toggle shows
// the generic label.
const spec: DiagramSpec = {
  title: "A managed connection service holds the sockets and calls your code by connection id",
  width: 520,
  height: 520,
  steps: [
    { title: "The service holds every socket" },
    { title: "Your code hears “7f3 connected”" },
    { title: "Your code sends to an id" },
  ],
  zones: [
    { id: "shoppers", title: "Shoppers", tone: "neutral", x: 10, y: 40, w: 250, h: 120 },
    { id: "managed", title: "Managed", tone: "blue", x: 10, y: 210, w: 250, h: 120 },
    { id: "code", title: "Your code", tone: "teal", x: 10, y: 380, w: 250, h: 120 },
    { id: "data", title: "Data", tone: "violet", x: 300, y: 210, w: 210, h: 290 },
  ],
  nodes: [
    // Step 1
    {
      id: "browsers",
      label: "Shoppers' pages",
      sub: "1,600 open",
      icon: "browser",
      tone: "neutral",
      x: 140,
      y: 100,
      w: 180,
    },
    {
      id: "service",
      label: "Connection service",
      sub: "holds every socket",
      icon: "proxy",
      tone: "blue",
      x: 140,
      y: 270,
      w: 200,
      cloud: {
        aws: { id: "aws-api-gateway", label: "WebSocket API" },
        azure: "azure-web-pubsub",
      },
    },

    // Step 2
    {
      id: "fn",
      label: "Your function",
      sub: "runs per event",
      icon: "function",
      tone: "teal",
      step: 2,
      x: 140,
      y: 440,
      w: 200,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },
    {
      id: "list",
      label: "Connection list",
      sub: "id → poster",
      icon: "registry",
      tone: "violet",
      step: 2,
      x: 410,
      y: 270,
      w: 190,
      cloud: { aws: "aws-dynamodb", gcp: "gcp-firestore", azure: "azure-cosmos-db" },
    },

    // Step 3
    {
      id: "db",
      label: "Orders database",
      sub: "stock changes",
      icon: "database",
      tone: "violet",
      step: 3,
      x: 410,
      y: 440,
      w: 190,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },
  ],
  edges: [
    // Step 1: the provider holds the connections and answers the pings.
    { from: "browsers", to: "service", label: "1,600 sockets", bidirectional: true, flow: true, labelAt: 0.4 },

    // Step 2: a connect event arrives with an id; the function writes down who is watching what.
    { from: "service", to: "fn", label: "connect: id 7f3", packet: true, labelAt: 0.35, step: 2, until: 2 },
    { from: "fn", to: "list", label: "7f3 → poster 18", packet: true, delay: 1.2, step: 2 },

    // Step 3: stock changes; the function asks the service to send to the ids that watch that poster.
    { from: "db", to: "fn", label: "13 left", packet: true, step: 3 },
    {
      from: "fn",
      to: "service",
      label: "send to 7f3",
      bidirectional: true,
      packet: true,
      delay: 1.2,
      labelAt: 0.65,
      step: 3,
    },
  ],
};

export default spec;
