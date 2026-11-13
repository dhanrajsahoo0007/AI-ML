import type { DiagramSpec } from "@/components/diagrams/types";

// Observability, told as the story of Brightpost's slow Pay button (cloud/operations/observability-on-the-cloud).
// Step 1: three services (shop app, order service, print service) on 2 servers each; every server writes its own log
// file, and Asha reads them over SSH. Step 2 (the failure step): Pay takes 9 s for some shoppers, support forwards 12
// complaints, and Asha spends 2 days matching lines in 3 formats with no shared id. Step 3: an agent on each server
// (the collector) ships metrics to a managed metrics store, and a dashboard charts them. Step 4: logs go to a central
// log store in one structured format. Step 5: a trace id travels with Pay from service to service, and spans land in
// a trace store. Step 6: an alert rule watches p99 Pay time and pages Asha.
//
// Nodes never move between steps. The SSH reads and the slow Pay are edges with `until`, so they leave the picture
// once the telemetry path replaces them.
//
// Layout: three columns.
//   Left (x 135), "the running system": shop app, order service, print service; support agent at the bottom.
//   Middle (x 400), "people and the pipe": shopper, collector, dashboard; Asha at the bottom.
//   Right (x 670), "managed backends": trace store, log store, metrics store; the alert rule at the bottom.
// Rows (centres): 120 | 290 | 440 | 610.
// shop 135,120 | shopper 400,120 | traces 670,120 | order 135,290 | collector 400,290 | logs 670,290 |
// print 135,440 | dashboard 400,440 | metrics 670,440 | support 135,610 | asha 400,610 | alert 670,610.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 use only the
// left and middle columns. The order service and the collector share a row, so that fan-in edge is straight; the
// shop and print edges enter the Telemetry zone through its left side, below its tab (tab: x 306-408, y 186-214).
// The vertical metrics-to-alert edge keeps its label high (labelAt 0.35) so the pill clears the Alerts tab.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon.
// Nodes are sized for the longest name the Services toggle puts in them ("Azure Monitor Metrics",
// "Application Insights", "CloudWatch dashboard", "Azure Monitor Agent").
const vm = {
  aws: "aws-ec2",
  gcp: "gcp-compute-engine",
  azure: { id: "azure-vm", label: "Virtual Machines" },
} as const;

const spec: DiagramSpec = {
  title: "From six log files to one telemetry path",
  width: 800,
  height: 700,
  steps: [
    { title: "Six servers, six log files" },
    { title: "A slow Pay nobody can follow" },
    { title: "Metrics leave the servers" },
    { title: "Logs go central, in one format" },
    { title: "One trace id joins the hops" },
    { title: "An alert watches what shoppers feel" },
  ],
  zones: [
    { id: "services", title: "Services", tone: "teal", x: 20, y: 40, w: 230, h: 460 },
    { id: "shoppers", title: "Shoppers", tone: "neutral", x: 290, y: 40, w: 220, h: 130 },
    { id: "telemetry", title: "Telemetry", tone: "orange", x: 290, y: 200, w: 220, h: 150 },
    { id: "views", title: "Views", tone: "blue", x: 290, y: 380, w: 220, h: 120 },
    { id: "backends", title: "Managed backends", tone: "violet", x: 550, y: 40, w: 240, h: 460 },
    { id: "people", title: "People", tone: "neutral", x: 20, y: 540, w: 490, h: 140 },
    { id: "alerts", title: "Alerts", tone: "orange", x: 550, y: 540, w: 240, h: 140 },
  ],
  nodes: [
    // Step 1
    {
      id: "shop",
      label: "Shop app",
      sub: "2 servers",
      icon: "server",
      tone: "teal",
      x: 135,
      y: 120,
      w: 180,
      cloud: vm,
    },
    {
      id: "order",
      label: "Order service",
      sub: "2 servers",
      icon: "server",
      tone: "teal",
      x: 135,
      y: 290,
      w: 180,
      cloud: vm,
    },
    {
      id: "print",
      label: "Print service",
      sub: "2 servers",
      icon: "server",
      tone: "teal",
      x: 135,
      y: 440,
      w: 180,
      cloud: vm,
    },
    { id: "shopper", label: "Shopper", sub: "presses Pay", icon: "phone", tone: "neutral", x: 400, y: 120, w: 180 },
    { id: "asha", label: "Asha", sub: "developer, on call", icon: "users", tone: "neutral", x: 400, y: 610, w: 180 },

    // Step 2: the failure
    {
      id: "support",
      label: "Support agent",
      sub: "12 emails in a week",
      icon: "chat",
      tone: "neutral",
      step: 2,
      x: 135,
      y: 610,
      w: 180,
    },

    // Step 3
    {
      id: "collector",
      label: "Collector",
      sub: "agent on each server",
      icon: "pipeline",
      tone: "orange",
      step: 3,
      x: 400,
      y: 290,
      w: 196,
      cloud: {
        aws: { label: "CloudWatch agent" },
        gcp: { label: "Ops Agent" },
        azure: { label: "Azure Monitor Agent" },
      },
    },
    {
      id: "metrics",
      label: "Metrics store",
      sub: "numbers over time",
      icon: "signal",
      tone: "violet",
      step: 3,
      x: 670,
      y: 440,
      w: 210,
      cloud: {
        aws: { id: "aws-cloudwatch", label: "CloudWatch metrics" },
        gcp: "gcp-cloud-monitoring",
        azure: { id: "azure-monitor", label: "Azure Monitor Metrics" },
      },
    },
    {
      id: "dashboard",
      label: "Dashboard",
      sub: "charts for people",
      icon: "chart",
      tone: "blue",
      step: 3,
      x: 400,
      y: 440,
      w: 196,
      cloud: {
        aws: { id: "aws-cloudwatch", label: "CloudWatch dashboard" },
        gcp: { id: "gcp-cloud-monitoring", label: "Monitoring dashboard" },
        azure: { id: "azure-monitor", label: "Monitor workbook" },
      },
    },

    // Step 4
    {
      id: "logs",
      label: "Log store",
      sub: "30 days, one format",
      icon: "log",
      tone: "violet",
      step: 4,
      x: 670,
      y: 290,
      w: 210,
      cloud: {
        aws: { id: "aws-cloudwatch", label: "CloudWatch Logs" },
        gcp: "gcp-cloud-logging",
        azure: { id: "azure-monitor", label: "Log Analytics" },
      },
    },

    // Step 5
    {
      id: "traces",
      label: "Trace store",
      sub: "spans joined by id",
      icon: "trace",
      tone: "violet",
      step: 5,
      x: 670,
      y: 120,
      w: 210,
      cloud: { aws: "aws-xray", gcp: "gcp-cloud-trace", azure: "azure-app-insights" },
    },

    // Step 6
    {
      id: "alert",
      label: "Alert rule",
      sub: "watches p99 Pay time",
      icon: "bell",
      tone: "orange",
      step: 6,
      x: 670,
      y: 610,
      w: 210,
      cloud: {
        aws: { id: "aws-cloudwatch", label: "CloudWatch alarm" },
        gcp: { id: "gcp-cloud-monitoring", label: "Alerting policy" },
        azure: { id: "azure-monitor", label: "Alert rule" },
      },
    },
  ],
  edges: [
    // Step 1: one Pay crosses three services; each server keeps its own log file, read by hand.
    { from: "shopper", to: "shop", label: "Pay", packet: true, until: 1 },
    { from: "shop", to: "order", label: "place order", packet: true, delay: 0.8, until: 4 },
    { from: "order", to: "print", label: "book slot", packet: true, delay: 1.6, until: 4 },
    { from: "asha", to: "print", label: "SSH, read files", dashed: true, until: 1 },

    // Step 2: Pay is slow for some shoppers, and the six files cannot say which lines belong to one Pay.
    { from: "shopper", to: "shop", label: "Pay: 9 s", tone: "red", packet: true, step: 2, until: 2 },
    { from: "asha", to: "print", label: "2 days, 3 formats", tone: "red", dashed: true, step: 2, until: 2 },
    { from: "support", to: "asha", label: "complaints", packet: true, step: 2 },

    // Step 3: an agent on every server sends numbers to the metrics store; the dashboard charts them.
    { from: "shopper", to: "shop", label: "Pay", packet: true, step: 3 },
    { from: "shop", to: "collector", dashed: true, flow: true, step: 3 },
    { from: "order", to: "collector", dashed: true, flow: true, step: 3 },
    { from: "print", to: "collector", dashed: true, flow: true, step: 3 },
    { from: "collector", to: "metrics", label: "metrics", flow: true, labelAt: 0.72, step: 3 },
    { from: "metrics", to: "dashboard", label: "charts", packet: true, step: 3 },

    // Step 4: the same agent ships structured log lines to one store.
    { from: "collector", to: "logs", label: "logs", flow: true, step: 4 },

    // Step 5: the trace id travels in a header with every hop; the spans meet in the trace store.
    { from: "shop", to: "order", label: "trace id 4bf9", packet: true, delay: 0.8, step: 5 },
    { from: "order", to: "print", label: "same trace id", packet: true, delay: 1.6, step: 5 },
    { from: "collector", to: "traces", label: "spans", flow: true, labelAt: 0.72, step: 5 },

    // Step 6: the alert reads the metric shoppers feel and pages the person on call.
    { from: "metrics", to: "alert", label: "p99 Pay > 2 s", labelAt: 0.35, step: 6 },
    { from: "alert", to: "asha", label: "page", packet: true, tone: "orange", step: 6 },
  ],
};

export default spec;
