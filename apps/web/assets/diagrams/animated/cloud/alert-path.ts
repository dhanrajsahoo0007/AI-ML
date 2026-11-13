import type { DiagramSpec } from "@/components/diagrams/types";

// From machine alarms to SLO alerts, told as Brightpost's muted Sunday (cloud/operations/slos-alerting-and-on-call).
// Step 1: every server metric has its own alarm, 140 alerts a week land in a chat channel. Step 2 (the failure
// step): half of all payments fail for 3 hours, and nobody sees it because the channel is muted. Step 3: a checkout
// SLI counts good and bad checkouts. Step 4: an SLO of 99.9% and a burn-rate alert on two windows. Step 5: routing
// sends a fast burn to the paging tool and a slow burn (and the 6 machine alarms that stay) to a ticket queue.
// Step 6: the paging tool calls the on-call engineer, who opens the runbook for that alert. Step 7: a blameless
// review writes the timeline and updates the runbook.
//
// Nodes never move between steps. The muted channel is not a node: it lives in the labels of edges that end at
// step 2 (`until: 2`). The failure is drawn as two red dashed edges.
//
// Layout: two zones on top that the team builds (Shoppers, Shop) in the left column, a "cloud's job" zone across the
// middle and right columns, and a "team's job" zone across the bottom.
//   Left (x 140): shoppers 100 | app servers 260 | ticket queue 650 | incident review 760.
//   Middle (x 400): metrics 260 | machine alarms 395 | on-call engineer 650 | runbook 760.
//   Right (x 660): checkout SLI 260 | burn-rate alert 395 | alert routing 500 | paging tool 650.
// Steps 1 and 2 use only the left and middle columns, so a phone shows them without scrolling sideways. The canvas
// stays under 800 wide so labels are readable in the 660 px article column.
//
// Zone tabs sit on each zone's top-left corner. Vertical edges run at x 140, 400 and 660, right of every tab, and
// every node's top is at least 26 units below its zone's top. Text room: a label takes up to 7.2 px per character
// and a sub line about 5.5 px, after 52 px for the icon. Nodes are sized for the longest name the Services toggle
// puts in them ("Amazon CloudWatch", "Application Signals", "Notification channel", "SLO burn-rate alarm").
const spec: DiagramSpec = {
  title: "From machine alarms to SLO alerts that page a person",
  width: 790,
  height: 830,
  steps: [
    { title: "An alarm on every machine metric" },
    { title: "The channel is muted; payments fail unseen" },
    { title: "Measure what shoppers feel: a checkout SLI" },
    { title: "Set an SLO and alert on the burn rate" },
    { title: "Route it: page now or ticket later" },
    { title: "The on-call engineer opens the runbook" },
    { title: "A blameless review closes the loop" },
  ],
  zones: [
    { id: "shoppers-z", title: "Shoppers", tone: "neutral", x: 20, y: 40, w: 250, h: 120 },
    { id: "shop-z", title: "Shop", tone: "teal", x: 20, y: 190, w: 250, h: 140 },
    { id: "cloud-z", title: "The cloud's job", tone: "orange", x: 290, y: 40, w: 480, h: 500 },
    { id: "team-z", title: "The team's job", tone: "neutral", x: 20, y: 575, w: 750, h: 235 },
  ],
  nodes: [
    // Step 1
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "60 checkouts an hour",
      icon: "users",
      tone: "neutral",
      x: 140,
      y: 100,
      w: 180,
    },
    {
      id: "app",
      label: "App servers",
      sub: "2 on a Sunday",
      icon: "server",
      tone: "teal",
      x: 140,
      y: 260,
      w: 180,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "metrics",
      label: "Metrics and logs",
      sub: "every server sends",
      icon: "signal",
      tone: "orange",
      x: 400,
      y: 260,
      w: 190,
      cloud: { aws: "aws-cloudwatch", gcp: "gcp-cloud-monitoring", azure: "azure-monitor" },
    },
    {
      id: "alarms",
      label: "Machine alarms",
      sub: "CPU, disk, every 5xx",
      icon: "bell",
      tone: "orange",
      x: 400,
      y: 395,
      w: 190,
      cloud: {
        aws: { label: "CloudWatch alarms" },
        gcp: { label: "Alerting policies" },
        azure: { label: "Metric alert rules" },
      },
    },
    {
      id: "oncall",
      label: "On-call engineer",
      sub: "Asha this week",
      icon: "user-check",
      tone: "neutral",
      x: 400,
      y: 650,
      w: 190,
    },

    // Step 3
    {
      id: "sli",
      label: "Checkout SLI",
      sub: "good ÷ all checkouts",
      icon: "meter",
      tone: "orange",
      step: 3,
      x: 660,
      y: 260,
      w: 190,
      cloud: {
        aws: { label: "Application Signals" },
        gcp: { label: "Service SLO" },
        azure: { label: "Log Analytics query" },
      },
    },

    // Step 4
    {
      id: "burn",
      label: "Burn-rate alert",
      sub: "1 h and 5 min windows",
      icon: "timer",
      tone: "orange",
      accent: true,
      step: 4,
      x: 660,
      y: 395,
      w: 190,
      cloud: {
        aws: { label: "SLO burn-rate alarm" },
        gcp: { label: "Burn-rate policy" },
        azure: { label: "Log search alert" },
      },
    },

    // Step 5
    {
      id: "route",
      label: "Alert routing",
      sub: "page or ticket",
      icon: "topic",
      tone: "orange",
      step: 5,
      x: 660,
      y: 500,
      w: 200,
      cloud: {
        aws: "aws-sns",
        gcp: { label: "Notification channel" },
        azure: { label: "Action group" },
      },
    },
    {
      id: "pager",
      label: "Paging tool",
      sub: "rota, calls, escalates",
      icon: "phone",
      tone: "neutral",
      step: 5,
      x: 660,
      y: 650,
      w: 190,
    },
    {
      id: "ticket",
      label: "Ticket queue",
      sub: "next working day",
      icon: "ticket",
      tone: "neutral",
      step: 5,
      x: 140,
      y: 650,
      w: 180,
    },

    // Step 6
    {
      id: "runbook",
      label: "Runbook",
      sub: "steps for this alert",
      icon: "file",
      tone: "blue",
      step: 6,
      x: 400,
      y: 760,
      w: 190,
    },

    // Step 7
    {
      id: "review",
      label: "Incident review",
      sub: "blameless, in 5 days",
      icon: "history",
      tone: "blue",
      step: 7,
      x: 140,
      y: 760,
      w: 180,
    },
  ],
  edges: [
    // Step 1: every metric has an alarm, and every alarm goes to one chat channel.
    { from: "shoppers", to: "app", label: "checkouts", packet: true, until: 1 },
    { from: "app", to: "metrics", label: "metrics", flow: true },
    { from: "metrics", to: "alarms", label: "140 rules" },
    { from: "alarms", to: "oncall", label: "140 alerts a week", packet: true, until: 1 },

    // Step 2: the failure. Half the payments fail; the alert lands in a muted channel.
    {
      from: "shoppers",
      to: "app",
      label: "1 in 2 payments fail",
      tone: "red",
      dashed: true,
      packet: true,
      step: 2,
      until: 2,
    },
    {
      from: "alarms",
      to: "oncall",
      label: "muted: unseen for 3 h",
      tone: "red",
      dashed: true,
      step: 2,
      until: 2,
    },

    // Step 3: count what shoppers feel.
    { from: "shoppers", to: "app", label: "checkouts", packet: true, step: 3 },
    { from: "metrics", to: "sli", label: "counts", flow: true },

    // Step 4: the target and the alert on how fast it is being used up.
    { from: "sli", to: "burn", label: "SLO 99.9%" },

    // Step 5: one route, two kinds of message.
    { from: "burn", to: "route", packet: true },
    { from: "route", to: "pager", label: "fast burn: page", packet: true, delay: 0.6 },
    { from: "route", to: "ticket", label: "slow burn: ticket", dashed: true, labelAt: 0.3 },
    { from: "alarms", to: "ticket", label: "6 kept: ticket", dashed: true },

    // Step 6: a person, and the page of steps for this alert.
    { from: "pager", to: "oncall", label: "calls", packet: true, delay: 1.2, step: 6 },
    { from: "oncall", to: "runbook", label: "opens", step: 6 },

    // Step 7: the review writes the timeline and fixes the runbook.
    { from: "oncall", to: "review", label: "timeline" },
    { from: "review", to: "runbook", label: "updates" },
  ],
};

export default spec;
