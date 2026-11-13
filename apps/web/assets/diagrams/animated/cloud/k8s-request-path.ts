import type { DiagramSpec } from "@/components/diagrams/types";

// Kubernetes from the outside in, told as Brightpost's sale-morning rollout (cloud/compute/kubernetes-concepts).
// Step 1: a Deployment asks for 3 copies of shop-web; one runs on each node, next to other apps' pods. Step 2: a
// Service gives the copies one stable address. Step 3: an Ingress makes the cloud's load balancer send shoppers to the
// Service. Step 4 (the failure step): a rolling update with no readiness check sends shoppers to copies that are still
// warming up, and removes the old ones without waiting. Step 5: a readiness check; the Service sends only to pods on the
// ready list, and the rollout replaces one copy at a time. Step 6: the pod autoscaler raises 3 copies to 5. Step 7: the
// two new pods are Pending, so the node autoscaler adds node 4 and they run there.
//
// Nodes never move. Pods are drawn by their slot, not their version: a rollout replaces the program inside the same
// slots, so the old and new versions live in the labels of edges with `until`, never as nodes.
//
// Layout: three columns.
//   Left (x 120), the request path: shoppers, load balancer, Service, ready list.
//   Middle (x 420), the cluster's machines: four node zones stacked, each with a shop-web pod and a second slot.
//   Right (x 665), what changes the count: the pod autoscaler on top, the node autoscaler beside node 4.
// The Deployment sits at the top of the middle column, above node 1.
// Rows: top row 90 | node 1 pods 207, 259 | node 2 362, 414 | node 3 517, 569 | node 4 672, 724.
//
// Why this order: on a phone the figure opens on its left 480 units. Steps 1 to 5 (pods, Service, load balancer, the
// failed rollout and the fix) happen in the left and middle columns; only the autoscalers of steps 6 and 7 need the
// right column. The canvas stays under 800 wide for the 660 px article column.
//
// Service to pod edges bend at x 290, so their last stretch runs level into each pod's left side and never cuts
// through another pod. The Deployment reaches nodes 2 and 3 through the gutter at x 540, between the node zones and
// the autoscaler zone. Zone tabs sit top-left; every vertical edge enters a zone right of its tab.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. The load
// balancer is sized for "Cloud Load Balancing" and "Application Gateway"; the node autoscaler for "Cluster autoscaler".
const SVC_BEND = 290;
const GUTTER = 540;

const spec: DiagramSpec = {
  title: "From the internet to a pod, and what a rollout needs",
  width: 795,
  height: 785,
  steps: [
    { title: "A Deployment asks for 3 copies" },
    { title: "A Service gives them one address" },
    { title: "Shoppers arrive through a load balancer" },
    { title: "A rollout with no readiness check" },
    { title: "Readiness check: only warm pods get traffic" },
    { title: "Pod autoscaler: 3 copies become 5" },
    { title: "Node autoscaler adds a node" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", x: 8, y: 32, w: 232, h: 108 },
    { id: "edge", title: "Cloud edge", tone: "blue", x: 8, y: 180, w: 232, h: 110 },
    { id: "cluster", title: "Cluster", tone: "blue", x: 8, y: 400, w: 232, h: 300 },
    { id: "desired", title: "Desired state", tone: "orange", x: 315, y: 32, w: 210, h: 108 },
    { id: "autoscalers", title: "Autoscalers", tone: "orange", x: 552, y: 32, w: 233, h: 728 },
    { id: "node1", title: "Node 1", tone: "teal", x: 315, y: 155, w: 210, h: 140 },
    { id: "node2", title: "Node 2", tone: "teal", x: 315, y: 310, w: 210, h: 140 },
    { id: "node3", title: "Node 3", tone: "teal", x: 315, y: 465, w: 210, h: 140 },
    { id: "node4", title: "Node 4 (new)", tone: "teal", x: 315, y: 620, w: 210, h: 140 },
  ],
  nodes: [
    // Step 1: the Deployment and the three copies it keeps, one per node, next to other apps' pods.
    {
      id: "deploy",
      label: "Deployment",
      sub: "shop-web: 3 copies",
      icon: "controller",
      tone: "orange",
      x: 420,
      y: 90,
      w: 176,
    },
    { id: "pod1", label: "Pod 1", sub: "shop-web", icon: "pod", tone: "teal", x: 420, y: 207, w: 130, h: 46 },
    {
      id: "other1",
      label: "Other pods",
      sub: "checkout, search",
      icon: "pod",
      tone: "neutral",
      x: 420,
      y: 259,
      w: 130,
      h: 46,
    },
    { id: "pod2", label: "Pod 2", sub: "shop-web", icon: "pod", tone: "teal", x: 420, y: 362, w: 130, h: 46 },
    {
      id: "other2",
      label: "Other pods",
      sub: "checkout, search",
      icon: "pod",
      tone: "neutral",
      x: 420,
      y: 414,
      w: 130,
      h: 46,
    },
    { id: "pod3", label: "Pod 3", sub: "shop-web", icon: "pod", tone: "teal", x: 420, y: 517, w: 130, h: 46 },
    {
      id: "other3",
      label: "Other pods",
      sub: "checkout, search",
      icon: "pod",
      tone: "neutral",
      x: 420,
      y: 569,
      w: 130,
      h: 46,
    },

    // Step 2: one stable name and address in front of the pods.
    {
      id: "service",
      label: "Service",
      sub: "one stable address",
      icon: "router",
      tone: "blue",
      step: 2,
      x: 120,
      y: 460,
      w: 180,
    },

    // Step 3: traffic from outside the cluster.
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "900 online at 10:00",
      icon: "users",
      tone: "neutral",
      step: 3,
      x: 120,
      y: 90,
      w: 176,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "made from the Ingress",
      icon: "load-balancer",
      tone: "blue",
      step: 3,
      x: 120,
      y: 235,
      w: 204,
      cloud: {
        aws: { id: "aws-elb", label: "Application LB" },
        gcp: "gcp-cloud-load-balancing",
        azure: "azure-app-gateway",
      },
    },

    // Step 5: the list of pods that passed their readiness check.
    {
      id: "ready",
      label: "Ready list",
      sub: "pods passing /ready",
      icon: "registry",
      tone: "blue",
      step: 5,
      x: 120,
      y: 640,
      w: 170,
    },

    // Step 6: the pod autoscaler.
    {
      id: "hpa",
      label: "Pod autoscaler",
      sub: "aims for 60% CPU",
      icon: "meter",
      tone: "orange",
      step: 6,
      x: 665,
      y: 90,
      w: 176,
    },

    // Step 7: the node autoscaler, node 4 and the two pods that were waiting for it.
    {
      id: "nodeauto",
      label: "Node autoscaler",
      sub: "adds a VM to the pool",
      icon: "controller",
      tone: "orange",
      step: 7,
      x: 665,
      y: 672,
      w: 204,
      cloud: {
        aws: { label: "Karpenter" },
        gcp: { label: "Cluster autoscaler" },
        azure: { label: "Cluster autoscaler" },
      },
    },
    { id: "pod4", label: "Pod 4", sub: "shop-web", icon: "pod", tone: "teal", step: 7, x: 420, y: 672, w: 130, h: 46 },
    { id: "pod5", label: "Pod 5", sub: "shop-web", icon: "pod", tone: "teal", step: 7, x: 420, y: 724, w: 130, h: 46 },
  ],
  edges: [
    // Step 1: the Deployment keeps one copy on each node. Its label changes at steps 4 and 5.
    { from: "deploy", to: "pod1", label: "keeps 3 running", until: 3 },
    {
      from: "deploy",
      to: "pod2",
      dashed: true,
      via: [
        [500, 140],
        [GUTTER, 140],
        [GUTTER, 362],
      ],
    },
    {
      from: "deploy",
      to: "pod3",
      dashed: true,
      via: [
        [500, 140],
        [GUTTER, 140],
        [GUTTER, 517],
      ],
    },

    // Step 2: the Service spreads requests over every copy it knows.
    { from: "service", to: "pod1", packet: true, via: [[SVC_BEND, 207]], step: 2, until: 3 },
    {
      from: "service",
      to: "pod2",
      label: "spreads requests",
      packet: true,
      via: [[SVC_BEND, 362]],
      labelAt: 0.32,
      step: 2,
      until: 3,
    },
    { from: "service", to: "pod3", packet: true, via: [[SVC_BEND, 517]], step: 2, until: 3 },

    // Step 3: shoppers reach the load balancer; it forwards to the Service.
    { from: "shoppers", to: "lb", label: "HTTPS", packet: true, step: 3 },
    { from: "lb", to: "service", label: "to the Service", packet: true, delay: 0.8, step: 3, until: 3 },

    // Step 4, the failure: new copies count as ready the moment they start. The Service sends shoppers to them while
    // they still load prices, and the rollout removes every old copy without waiting.
    { from: "deploy", to: "pod1", label: "swap all, no waiting", tone: "red", step: 4, until: 4 },
    { from: "lb", to: "service", label: "page errors", tone: "red", packet: true, step: 4, until: 4 },
    { from: "service", to: "pod1", tone: "red", dashed: true, via: [[SVC_BEND, 207]], step: 4, until: 4 },
    {
      from: "service",
      to: "pod2",
      label: "still warming",
      tone: "red",
      dashed: true,
      via: [[SVC_BEND, 362]],
      labelAt: 0.32,
      step: 4,
      until: 4,
    },
    { from: "service", to: "pod3", tone: "red", dashed: true, via: [[SVC_BEND, 517]], step: 4, until: 4 },

    // Step 5: the kubelet calls /ready on each pod; only pods that answer join the ready list, and the rollout
    // replaces one copy at a time.
    { from: "deploy", to: "pod1", label: "one at a time", step: 5 },
    { from: "ready", to: "service", label: "only these", dashed: true, step: 5 },
    { from: "lb", to: "service", label: "to the Service", packet: true, step: 5 },
    { from: "service", to: "pod1", packet: true, via: [[SVC_BEND, 207]], step: 5 },
    {
      from: "service",
      to: "pod2",
      label: "ready pods only",
      packet: true,
      via: [[SVC_BEND, 362]],
      labelAt: 0.32,
      step: 5,
    },
    { from: "service", to: "pod3", packet: true, via: [[SVC_BEND, 517]], step: 5 },

    // Step 6: CPU climbs past the target, so the pod autoscaler asks for more copies.
    { from: "hpa", to: "deploy", label: "3 → 5", packet: true, step: 6 },

    // Step 7: the two new pods do not fit on nodes 1 to 3, so they wait as Pending until node 4 joins.
    { from: "hpa", to: "nodeauto", label: "2 pods Pending", dashed: true, flow: true, step: 7 },
    { from: "nodeauto", to: "pod4", label: "node 4", packet: true, step: 7 },
    { from: "service", to: "pod4", packet: true, via: [[SVC_BEND, 672]], step: 7 },
    { from: "service", to: "pod5", packet: true, via: [[SVC_BEND, 724]], step: 7 },
  ],
};

export default spec;
