import type { DiagramSpec } from "@/components/diagrams/types";

// What the cloud is, told as Brightpost's first big sale day (cloud/fundamentals/what-is-cloud).
// Step 1: shoppers reach one rented server, sized for an ordinary day. Step 2 (the failure step): on sale day 2,000
// shoppers arrive at once, ten times what the server can take, and about 1,200 orders are lost. Step 3: the
// provider's API swaps the server for one 4 times bigger in minutes, which serves 800 of the 2,000. Step 4: a load
// balancer shares the traffic between the server and up to 9 extra servers. Step 5: a scaling rule adds servers
// when they are busy and removes them when it is quiet. Step 6: the bill counts only the minutes each server ran.
//
// Nodes never move and never disappear. Things a later step replaces live in edge labels with `until`: the three
// shopper-to-server edges of steps 1, 2 and 3, the failure edge to "Orders lost", and the one-off resize call.
//
// Layout: three columns that read left to right.
//   Left (x 110), "the outside world": shoppers and the orders that were lost.
//   Middle (x 390), "what Brightpost runs first": load balancer, app server, usage meter.
//   Right (x 650), "what the cloud adds": extra servers, the scaling rule and the provider's API.
// Rows (centres): 110 | 260 | 420 | 570.
// lb 390,110 | shoppers 110,170 | server 390,260 | extra 650,260 | lost 110,400 | meter 390,420 |
// autoscaler 650,420 | api 650,570.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 (the free
// preview and the failure) use only the left and middle columns. The canvas stays under 800 wide so labels are
// readable in the 660 px article column.
//
// Zone tabs sit on the top-left corner of each zone. The shoppers sit at y 170, so their edge to the server enters
// the Compute zone below its tab, and the vertical edges into Compute and Billing run at x 390, right of the tabs.
// The resize edge (api to server) shows only in step 3, so it never crosses the step 6 edge from the extra servers
// to the meter.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle puts in them ("Managed instance group", "Cloud Load
// Balancing", "Compute Engine API", "Autoscale setting").
const spec: DiagramSpec = {
  title: "From one rented server to capacity that follows demand",
  width: 790,
  height: 650,
  steps: [
    { title: "One rented server" },
    { title: "Sale day: ten times the shoppers" },
    { title: "A bigger server in minutes" },
    { title: "More servers behind one front door" },
    { title: "A rule adds and removes servers" },
    { title: "Pay for the minutes that ran" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", x: 10, y: 40, w: 200, h: 420 },
    { id: "network", title: "Network", tone: "blue", x: 280, y: 40, w: 220, h: 125 },
    { id: "compute", title: "Compute", tone: "teal", x: 280, y: 200, w: 500, h: 120 },
    { id: "billing", title: "Billing", tone: "orange", x: 280, y: 360, w: 220, h: 100 },
    { id: "control", title: "Control", tone: "orange", x: 540, y: 360, w: 240, h: 270 },
  ],
  nodes: [
    // Step 1
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "400 orders a day",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 110,
      y: 170,
    },
    {
      id: "server",
      label: "App server",
      sub: "the whole shop",
      icon: "server",
      tone: "teal",
      x: 390,
      y: 260,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },

    // Step 2: the failure
    {
      id: "lost",
      label: "Orders lost",
      sub: "about 1,200",
      icon: "bag",
      tone: "red",
      step: 2,
      x: 110,
      y: 400,
      w: 170,
    },

    // Step 3
    {
      id: "api",
      label: "Provider's API",
      sub: "takes requests",
      icon: "api",
      tone: "orange",
      step: 3,
      x: 650,
      y: 570,
      w: 196,
      cloud: {
        aws: { label: "AWS APIs" },
        gcp: { label: "Compute Engine API" },
        azure: { label: "Resource Manager" },
      },
    },

    // Step 4
    {
      id: "lb",
      label: "Load balancer",
      sub: "one front door",
      icon: "load-balancer",
      tone: "blue",
      step: 4,
      x: 390,
      y: 110,
      w: 200,
      cloud: { aws: "aws-elb", gcp: "gcp-cloud-load-balancing", azure: "azure-load-balancer" },
    },
    {
      id: "extra",
      label: "Extra servers",
      sub: "0 to 9, same copy",
      icon: "server",
      tone: "teal",
      step: 4,
      x: 650,
      y: 260,
      w: 212,
      cloud: {
        aws: { label: "Auto Scaling group" },
        gcp: { label: "Managed instance group" },
        azure: { label: "VM Scale Sets" },
      },
    },

    // Step 5
    {
      id: "autoscaler",
      label: "Scaling rule",
      sub: "keeps CPU near 60%",
      icon: "controller",
      tone: "orange",
      step: 5,
      x: 650,
      y: 420,
      w: 180,
      cloud: {
        aws: { label: "Scaling policy" },
        gcp: { label: "Autoscaler" },
        azure: { label: "Autoscale setting" },
      },
    },

    // Step 6
    {
      id: "meter",
      label: "Usage meter",
      sub: "server-minutes",
      icon: "meter",
      tone: "orange",
      step: 6,
      x: 390,
      y: 420,
      w: 176,
      cloud: {
        aws: { label: "AWS Billing" },
        gcp: "gcp-cloud-billing",
        azure: "azure-cost-management",
      },
    },
  ],
  edges: [
    // Step 1: an ordinary day fits one server.
    { from: "shoppers", to: "server", label: "ordinary day", packet: true, until: 1 },

    // Step 2: ten times the shoppers; the server cannot answer them all.
    {
      from: "shoppers",
      to: "server",
      label: "2,000 at once",
      tone: "red",
      packet: true,
      step: 2,
      until: 2,
    },
    { from: "server", to: "lost", label: "timed out", tone: "red", dashed: true, step: 2, until: 2 },

    // Step 3: one request to the provider's API swaps the server for a bigger size. It helps, up to a ceiling.
    { from: "api", to: "server", label: "resize: 4x", packet: true, labelAt: 0.4, step: 3, until: 3 },
    { from: "shoppers", to: "server", label: "800 of 2,000 served", tone: "orange", packet: true, step: 3, until: 3 },

    // Step 4: one front door shares the traffic between the server and the extra servers.
    { from: "shoppers", to: "lb", label: "every shopper", packet: true, step: 4 },
    { from: "lb", to: "server", label: "share", packet: true, delay: 1, step: 4 },
    { from: "lb", to: "extra", label: "share", packet: true, delay: 1, step: 4 },

    // Step 5: the rule watches how busy the servers are and asks the same API to add or remove them.
    { from: "autoscaler", to: "extra", label: "busy: add · quiet: remove", flow: true, step: 5 },
    { from: "autoscaler", to: "api", label: "asks", dashed: true, step: 5 },

    // Step 6: every server reports the minutes it ran; nothing is billed for a server that is not running.
    { from: "server", to: "meter", label: "minutes ran", dashed: true, flow: true, step: 6 },
    { from: "extra", to: "meter", label: "only while on", dashed: true, flow: true, step: 6 },
  ],
};

export default spec;
