import type { DiagramSpec } from "@/components/diagrams/types";

// High availability inside one region, told as Brightpost's autumn sale (cloud/resilience/ha-patterns). Later pages
// (dr-strategies, multi-region, zero-trust) may embed it by step and highlight nodes by id, so the ids are part of
// the contract: users, lb, server-a, server-b, server-c, db, standby, fault, flags, partner. Never rename one.
//
// Step 1: one copy of everything: one app server and the orders database, both in zone A. Step 2: the app tier is
// stateless, so it is copied into three zones behind a load balancer; each server box stands for that zone's share
// of the group. Step 3: the managed database gets a synchronous standby in zone B. Step 4 (the only failure step):
// a network fault cuts zone B off on sale day; the load balancer gets no answer there, and the servers in zones A
// and C, which were already 80% busy, must carry 120% each. Step 5: headroom for losing a zone: 4 servers per zone
// at 60%, so two zones can carry the load at 90%. Step 6: the balancer's health check asks a readiness path that
// tests the database too. Step 7: every call to the printing partner's API has a timeout, and a feature flag can
// switch the extras off.
//
// Nodes never move between steps. The network fault is a node (it stays, faded, as the reminder of what happened).
// What changes from step to step on the load-balancer edges are twins: the base edges carry no label, and the
// labelled twins of steps 4 and 5 end with `until`, so two labels never sit in the same place.
//
// Layout: columns are zones, rows are tiers, as in vpc-three-tier. The top strip holds the internet (shoppers) and
// the load balancer, which serves all three zones and must not look as if it lives in one. The bottom strip holds
// the feature-flag service (regional) and the partner's API (outside the cloud).
//   Top strip (y 20-120): users 130,75 | lb 394,75.
//   Zone columns (y 160-635): A x 10-258 | B x 270-518 | C x 530-785; tabs end near x 85 / 350 / 605 and reach from y 146 to 174.
//   App row y 245: server-a 134 | server-b 394 | server-c 654. Data row y 415: db 134 | standby 394.
//   fault 370,535 in zone B, under the standby.
//   Bottom strip (y 660-775): flags 410,738 | partner 654,738 (low enough that the NEW ring clears the inline labels).
// Edge routes: the load balancer reaches server A and server C along the corridor at y 125, between the top strip
// and the zone tabs, and drops into each server's top at its centre x (right of the zone tabs). Server B is straight
// below it. Servers B and C reach the database on diagonals that pass between the app row and the data row. The
// flag edge runs from the bottom strip up to server C, right of the fault node; the partner edge runs straight
// down zone C, which is empty below its server for that reason.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left ~480 units. Steps 1 to 4 (the free
// preview and the failure) happen in the top strip, zone A and zone B, all left of x 520. The canvas stays under
// 800 wide so labels are readable in the 660 px article column.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the
// longest name the Services toggle shows: "Application Gateway" (lb, w 210), "Virtual Machines" (servers, w 176),
// "Cloud SQL standby" (standby, w 182), "App Configuration" (flags, w 182).
const server = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;

// Load balancer to server A and to server C: down into the corridor at y 125, then along it, then down.
const toServerA: [number, number][] = [
  [360, 125],
  [134, 125],
];
const toServerC: [number, number][] = [
  [430, 125],
  [654, 125],
];

const spec: DiagramSpec = {
  title: "From one copy of everything to a tier that can lose a zone",
  width: 795,
  height: 790,
  steps: [
    { title: "One copy of everything" },
    { title: "Stateless copies in three zones" },
    { title: "A standby database in another zone" },
    { title: "Sale day: zone B is cut off" },
    { title: "Room to lose a zone" },
    { title: "Health checks that test the database" },
    { title: "Timeouts and a switch for the extras" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", kind: "subnet", x: 10, y: 20, w: 240, h: 100 },
    { id: "regional", title: "Regional service", tone: "blue", kind: "subnet", x: 270, y: 20, w: 248, h: 100 },
    { id: "zone-a", title: "Zone A", tone: "neutral", x: 10, y: 160, w: 248, h: 475 },
    { id: "zone-b", title: "Zone B", tone: "neutral", x: 270, y: 160, w: 248, h: 475 },
    { id: "zone-c", title: "Zone C", tone: "neutral", x: 530, y: 160, w: 255, h: 475 },
    { id: "config", title: "Regional service", tone: "orange", kind: "subnet", x: 270, y: 660, w: 248, h: 115 },
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 530, y: 660, w: 255, h: 115 },
  ],
  nodes: [
    // Step 1
    {
      id: "users",
      label: "Shoppers",
      sub: "phones and laptops",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 75,
      w: 166,
    },
    {
      id: "server-a",
      label: "App server A",
      sub: "keeps no baskets",
      icon: "server",
      tone: "teal",
      x: 134,
      y: 245,
      w: 176,
      cloud: server,
    },
    {
      id: "db",
      label: "Orders database",
      sub: "primary",
      icon: "database",
      tone: "violet",
      x: 134,
      y: 415,
      w: 176,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure Postgres" },
      },
    },

    // Step 2
    {
      id: "lb",
      label: "Load balancer",
      sub: "health check every 10 s",
      icon: "load-balancer",
      tone: "blue",
      step: 2,
      x: 394,
      y: 75,
      w: 210,
      cloud: {
        aws: { id: "aws-elb", label: "Application LB" },
        gcp: "gcp-cloud-load-balancing",
        azure: "azure-app-gateway",
      },
    },
    {
      id: "server-b",
      label: "App server B",
      sub: "keeps no baskets",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 394,
      y: 245,
      w: 176,
      cloud: server,
    },
    {
      id: "server-c",
      label: "App server C",
      sub: "keeps no baskets",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 654,
      y: 245,
      w: 176,
      cloud: server,
    },

    // Step 3
    {
      id: "standby",
      label: "Standby copy",
      sub: "takes over in 2 min",
      icon: "database",
      tone: "violet",
      step: 3,
      x: 394,
      y: 415,
      w: 182,
      cloud: {
        aws: { id: "aws-rds", label: "RDS standby" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL standby" },
        azure: { id: "azure-postgresql", label: "Postgres standby" },
      },
    },

    // Step 4: the failure
    {
      id: "fault",
      label: "Network fault",
      sub: "zone B cut off 26 min",
      icon: "alert-triangle",
      tone: "red",
      step: 4,
      x: 370,
      y: 535,
      w: 176,
    },

    // Step 7
    {
      id: "flags",
      label: "Feature flags",
      sub: "switches read live",
      icon: "flag",
      tone: "orange",
      step: 7,
      x: 410,
      y: 738,
      w: 182,
      cloud: {
        aws: { label: "AppConfig" },
        azure: "azure-app-configuration",
      },
    },
    {
      id: "partner",
      label: "Partner API",
      sub: "delivery dates",
      icon: "api",
      tone: "neutral",
      step: 7,
      x: 654,
      y: 738,
      w: 166,
    },
  ],
  edges: [
    // Step 1: shoppers reach the one server; it keeps every order in the one database.
    { from: "users", to: "server-a", label: "HTTPS", packet: true, until: 1 },
    { from: "server-a", to: "db", label: "orders, baskets", packet: true, delay: 1 },

    // Step 2: shoppers reach the load balancer, which shares them between three stateless servers.
    { from: "users", to: "lb", label: "HTTPS", packet: true, step: 2 },
    { from: "lb", to: "server-a", packet: true, delay: 0.8, via: toServerA },
    { from: "lb", to: "server-b", packet: true, delay: 1.1 },
    { from: "lb", to: "server-c", packet: true, delay: 1.4, via: toServerC },
    { from: "server-b", to: "db", packet: true, delay: 2 },
    { from: "server-c", to: "db", packet: true, delay: 2.3 },

    // Step 3: every write is copied to the standby in zone B before the shop says "order placed".
    { from: "db", to: "standby", label: "sync copy", dashed: true, flow: true, step: 3 },

    // Step 4: zone B is cut off. No answer from server B; A and C, already 80% busy, carry 120% each.
    {
      from: "lb",
      to: "server-b",
      label: "no answer",
      tone: "red",
      dashed: true,
      labelAt: 0.3,
      step: 4,
      until: 4,
    },
    {
      from: "lb",
      to: "server-a",
      label: "120% busy",
      tone: "red",
      packet: true,
      duration: 1.2,
      via: toServerA,
      labelAt: 0.55,
      step: 4,
      until: 4,
    },
    {
      from: "lb",
      to: "server-c",
      label: "120% busy",
      tone: "red",
      packet: true,
      duration: 1.2,
      via: toServerC,
      labelAt: 0.35,
      step: 4,
      until: 4,
    },

    // Step 5: 4 servers in each zone at 60%; with one zone dark, the other two would run at 90%.
    {
      from: "lb",
      to: "server-a",
      label: "4 at 60%",
      tone: "green",
      packet: true,
      via: toServerA,
      labelAt: 0.55,
      step: 5,
      until: 5,
    },
    { from: "lb", to: "server-b", label: "4 at 60%", tone: "green", packet: true, labelAt: 0.3, step: 5, until: 5 },
    {
      from: "lb",
      to: "server-c",
      label: "4 at 60%",
      tone: "green",
      packet: true,
      via: toServerC,
      labelAt: 0.35,
      step: 5,
      until: 5,
    },

    // Step 6: the health check asks a readiness path that also runs one small query on the database.
    { from: "lb", to: "server-a", label: "GET /ready", dashed: true, via: toServerA, labelAt: 0.55, step: 6 },
    { from: "lb", to: "server-b", label: "GET /ready", dashed: true, labelAt: 0.3, step: 6 },
    { from: "lb", to: "server-c", label: "GET /ready", dashed: true, via: toServerC, labelAt: 0.35, step: 6 },

    // Step 7: a timeout on the partner's API, and a switch that turns the extras off.
    { from: "server-c", to: "partner", label: "800 ms timeout", packet: true, step: 7 },
    { from: "flags", to: "server-c", label: "extras off", dashed: true, flow: true, labelAt: 0.27, step: 7 },
  ],
};

export default spec;
