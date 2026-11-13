import type { DiagramSpec } from "@/components/diagrams/types";

// Autoscaling as one control loop, told as Brightpost's newsletter evening (cloud/compute/autoscaling).
// Step 1: servers 1-2 report processor use to the metrics service; the autoscaler compares the average with 60%.
// Step 2: the autoscaler raises the count; servers 3-6 boot from the image and join the balancer after warm-up.
// Step 3 (the failure step): two quiet minutes after the first wave, the autoscaler removes 4 servers at once,
// with no drain, and the 18:15 wave meets 2 servers. Step 4: scale-in waits, drains for 60 s and removes one at a
// time, so the next wave meets 6 servers. Step 5: a schedule and a forecast act ahead of known rushes. Step 6: a warm
// pool of stopped servers joins in about a minute. Step 7: receipt workers scale on the queue's backlog, not on CPU.
//
// Nodes never move between steps. The removal is never a node: it is an edge that arcs left of the scale-out edge,
// red in step 3 (`until: 3`) and replaced by the safe version from step 4. The next wave's red edge ends at step 3
// in the same way.
//
// Layout: three columns. Left (x 140): the request path and the loop's sensor, top to bottom: shoppers, load
// balancer, servers 1-2, metrics service, schedule. Middle (x 400): next wave, image, servers 3-6, autoscaler,
// forecast. Right (x 690): warm pool, order queue, receipt workers.
// Rows (centres): 80 | 205 | 330 | 500 | 640.
// The loop is a square with no crossings: servers 1-2 down to metrics, metrics right to the autoscaler, the
// autoscaler up to servers 3-6. The removal arc bulges left of that last edge, through (270, 415).
//
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 to 5 use only the left and middle
// columns, so the free preview and the failure show without scrolling; only steps 6 and 7 need the right column.
// A "Server group" or "Control loop" tab would reach x 150 and sit on the vertical edges at x 140, so the left-hand
// zones use the subnet kind (inline label, no tab). Only "Receipts" keeps a tab: its edges enter from the side.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Nodes are sized for
// the longest name the Services toggle shows ("Cloud Load Balancing", "Predictive autoscaling", "Recurrence profile").
const spec: DiagramSpec = {
  title: "Autoscaling as a control loop: measure, compare, act, wait",
  width: 790,
  height: 720,
  steps: [
    { title: "Measure and compare with a target" },
    { title: "Scale out, then wait for warm-up" },
    { title: "Flapping: removed 2 minutes later" },
    { title: "Scale in slowly, drain first" },
    { title: "Schedule and forecast known rushes" },
    { title: "A warm pool starts in a minute" },
    { title: "Queue workers scale on backlog" },
  ],
  zones: [
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 10, y: 25, w: 520, h: 112 },
    { id: "group", title: "Server group", tone: "teal", kind: "subnet", x: 10, y: 272, w: 775, h: 112 },
    { id: "loop", title: "Control loop", tone: "orange", kind: "subnet", x: 10, y: 443, w: 530, h: 262 },
    { id: "print", title: "Receipts", tone: "orange", x: 580, y: 443, w: 205, h: 262 },
  ],
  nodes: [
    // Step 1: the request path and the loop.
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "from the newsletter",
      icon: "users",
      tone: "neutral",
      x: 140,
      y: 80,
      w: 190,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "spreads shoppers",
      icon: "load-balancer",
      tone: "blue",
      x: 140,
      y: 205,
      w: 200,
      cloud: {
        aws: { id: "aws-elb", label: "Application LB" },
        gcp: "gcp-cloud-load-balancing",
        azure: "azure-app-gateway",
      },
    },
    {
      id: "servers12",
      label: "Servers 1–2",
      sub: "running at 18:00",
      icon: "server",
      tone: "teal",
      x: 140,
      y: 330,
      w: 190,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "metrics",
      label: "Metrics service",
      sub: "average CPU, 1 min",
      icon: "signal",
      tone: "orange",
      x: 140,
      y: 500,
      w: 190,
      cloud: { aws: "aws-cloudwatch", gcp: "gcp-cloud-monitoring", azure: "azure-monitor" },
    },
    {
      id: "autoscaler",
      label: "Autoscaler",
      sub: "target: 60% CPU",
      icon: "controller",
      tone: "orange",
      accent: true,
      x: 400,
      y: 500,
      w: 180,
      cloud: {
        aws: { label: "EC2 Auto Scaling" },
        gcp: { label: "MIG autoscaler" },
        azure: { label: "Autoscale setting" },
      },
    },

    // Step 2: scale out from the image.
    {
      id: "image",
      label: "Server image",
      sub: "app installed",
      icon: "image",
      tone: "violet",
      step: 2,
      x: 400,
      y: 205,
      w: 190,
      cloud: {
        aws: { label: "Launch template" },
        gcp: { label: "Instance template" },
        azure: { label: "Scale set model" },
      },
    },
    {
      id: "servers36",
      label: "Servers 3–6",
      sub: "about 4 min to start",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 400,
      y: 330,
      w: 180,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },

    // Step 3: the failure.
    {
      id: "nextwave",
      label: "Next wave",
      sub: "18:15, 700 shoppers",
      icon: "users",
      tone: "neutral",
      step: 3,
      x: 400,
      y: 80,
      w: 190,
    },

    // Step 5: act ahead of demand.
    {
      id: "schedule",
      label: "Schedule",
      sub: "sale days: 10 at 8:30",
      icon: "clock",
      tone: "orange",
      step: 5,
      x: 140,
      y: 640,
      w: 190,
      cloud: {
        aws: { label: "Scheduled action" },
        gcp: { label: "Scaling schedule" },
        azure: { label: "Recurrence profile" },
      },
    },
    {
      id: "forecast",
      label: "Forecast",
      sub: "learns the daily curve",
      icon: "chart",
      tone: "orange",
      step: 5,
      x: 400,
      y: 640,
      w: 212,
      cloud: {
        aws: { label: "Predictive scaling" },
        gcp: { label: "Predictive autoscaling" },
        azure: { label: "Predictive autoscale" },
      },
    },

    // Step 6: capacity kept close by.
    {
      id: "warm",
      label: "Warm pool",
      sub: "4 stopped servers",
      icon: "server",
      tone: "teal",
      step: 6,
      x: 690,
      y: 330,
      w: 180,
      cloud: {
        aws: { label: "Warm pool" },
        gcp: { label: "Standby pool" },
        azure: { label: "Standby pool" },
      },
    },

    // Step 7: a second group that scales on its queue.
    {
      id: "queue",
      label: "Order queue",
      sub: "paid orders",
      icon: "queue",
      tone: "orange",
      step: 7,
      x: 688,
      y: 500,
      w: 180,
      cloud: { aws: "aws-sqs", gcp: "gcp-pubsub", azure: "azure-service-bus" },
    },
    {
      id: "workers",
      label: "Receipt workers",
      sub: "PDF and email",
      icon: "workers",
      tone: "teal",
      step: 7,
      x: 688,
      y: 640,
      w: 180,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
  ],
  edges: [
    // Step 1: measure and compare.
    { from: "shoppers", to: "lb", label: "browse, buy", packet: true },
    { from: "lb", to: "servers12", label: "requests", packet: true, delay: 0.6, labelAt: 0.35 },
    { from: "servers12", to: "metrics", label: "CPU each minute", dashed: true, flow: true },
    { from: "metrics", to: "autoscaler", label: "average", packet: true, delay: 1.2 },

    // Step 2: scale out; the new servers take shoppers only after warm-up.
    { from: "autoscaler", to: "servers36", label: "add 4", packet: true, step: 2 },
    { from: "image", to: "servers36", label: "boots from", dashed: true, step: 2 },
    { from: "lb", to: "servers36", label: "after warm-up", packet: true, delay: 1.2, labelAt: 0.4, step: 2 },

    // Step 3: the failure. Four servers go at once, two minutes after the wave, and the next wave meets two.
    {
      from: "autoscaler",
      to: "servers36",
      label: "removed after 2 min",
      tone: "red",
      dashed: true,
      via: [[270, 415]],
      step: 3,
      until: 3,
    },
    {
      from: "nextwave",
      to: "lb",
      label: "meets 2 servers",
      tone: "red",
      packet: true,
      labelAt: 0.55,
      step: 3,
      until: 3,
    },

    // Step 4: the safe scale-in replaces the red arc; the next wave now meets six servers.
    {
      from: "autoscaler",
      to: "servers36",
      label: "drain 60 s, remove 1",
      tone: "green",
      dashed: true,
      via: [[270, 415]],
      step: 4,
    },
    { from: "nextwave", to: "lb", label: "meets 6 servers", packet: true, labelAt: 0.55, step: 4 },

    // Step 5: a schedule raises the floor; a forecast starts servers before the usual rise.
    { from: "schedule", to: "autoscaler", label: "sets the floor", dashed: true, step: 5 },
    { from: "forecast", to: "autoscaler", label: "expected load", dashed: true, step: 5 },

    // Step 6: the warm pool hands over servers that are already installed.
    { from: "warm", to: "servers36", label: "1 min to join", packet: true, step: 6 },

    // Step 7: the queue's backlog, not processor use, drives the worker count.
    { from: "queue", to: "workers", label: "messages", packet: true, step: 7 },
    { from: "queue", to: "autoscaler", label: "backlog", dashed: true, flow: true, step: 7 },
    { from: "autoscaler", to: "workers", label: "add workers", packet: true, delay: 1.2, step: 7 },
  ],
};

export default spec;
