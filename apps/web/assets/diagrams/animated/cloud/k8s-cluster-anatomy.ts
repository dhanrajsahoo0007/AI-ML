import type { DiagramSpec } from "@/components/diagrams/types";

// The parts of one Kubernetes cluster (cloud/compute/kubernetes-concepts). One idea: what you want is written down in
// the control plane, and what actually runs lives on the nodes. You send the desired state to the API server, which
// saves it in the state store. Controllers compare desired with actual and fix the gap; the scheduler picks a node for
// each new pod; the kubelet on each node starts the pods it is given and reports back.
//
// A single picture, no build steps. Pages point at parts of it with `highlight` and `path`.
//
// Layout: two bands.
//   Top band: "You" on the left (x 130, row 215); the control plane in the middle and right columns: controllers
//   (400, 95), scheduler (665, 95), API server (400, 215), state store (665, 215).
//   Bottom band: the node pool, three node zones side by side (Node 1 left, Node 2 middle, Node 3 right), each with a
//   kubelet (y 375) and two pods drawn as glyphs (y 462): shop-web plus one other app.
//
// Why this order: on a phone the figure opens on its left 480 units, which hold You, the API server, the controllers
// and nodes 1 and 2. The state store and the scheduler need a sideways scroll.
//
// The API server reaches the outer kubelets by leaving its bottom edge and turning along y 280, below "You" and the
// state store, so the last stretch of each edge runs straight down into its node zone, right of the zone's tab and
// the node pool's tab. Pods are glyph nodes, because "shop-web" and "checkout" do not fit beside an icon in a card
// half a node zone wide.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. The API
// server is sized for "EKS control plane".
const BEND = 280;

const spec: DiagramSpec = {
  title: "Inside a Kubernetes cluster: control plane and nodes",
  width: 795,
  height: 565,
  zones: [
    { id: "you", title: "You", tone: "neutral", x: 10, y: 160, w: 240, h: 100 },
    { id: "cp", title: "Control plane", tone: "orange", x: 262, y: 40, w: 523, h: 225 },
    { id: "pool", title: "Node pool", tone: "teal", kind: "region", x: 5, y: 292, w: 785, h: 262 },
    { id: "node1", title: "Node 1", tone: "teal", x: 12, y: 318, w: 242, h: 222 },
    { id: "node2", title: "Node 2", tone: "teal", x: 278, y: 318, w: 242, h: 222 },
    { id: "node3", title: "Node 3", tone: "teal", x: 543, y: 318, w: 242, h: 222 },
  ],
  nodes: [
    {
      id: "you",
      label: "You",
      sub: "or a deploy pipeline",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 215,
      w: 176,
    },
    {
      id: "controllers",
      label: "Controllers",
      sub: "compare, then fix",
      icon: "controller",
      tone: "orange",
      x: 400,
      y: 95,
      w: 176,
    },
    {
      id: "scheduler",
      label: "Scheduler",
      sub: "picks a node",
      icon: "map",
      tone: "orange",
      x: 665,
      y: 95,
      w: 176,
    },
    {
      id: "api",
      label: "API server",
      sub: "the only front door",
      icon: "api",
      tone: "orange",
      accent: true,
      x: 400,
      y: 215,
      w: 184,
      cloud: {
        aws: { id: "aws-eks", label: "EKS control plane" },
        gcp: { id: "gcp-gke", label: "GKE control plane" },
        azure: { id: "azure-aks", label: "AKS control plane" },
      },
    },
    {
      id: "store",
      label: "State store",
      sub: "desired and actual",
      icon: "database",
      tone: "violet",
      x: 665,
      y: 215,
      w: 176,
    },

    { id: "kubelet1", label: "Kubelet", sub: "zone A", icon: "node", tone: "teal", x: 130, y: 375, w: 150 },
    { id: "kubelet2", label: "Kubelet", sub: "zone B", icon: "node", tone: "teal", x: 400, y: 375, w: 150 },
    { id: "kubelet3", label: "Kubelet", sub: "zone C", icon: "node", tone: "teal", x: 665, y: 375, w: 150 },

    { id: "web1", label: "shop-web", sub: "pod", icon: "pod", tone: "teal", variant: "glyph", x: 75, y: 462 },
    { id: "app1", label: "checkout", sub: "pod", icon: "pod", tone: "neutral", variant: "glyph", x: 185, y: 462 },
    { id: "web2", label: "shop-web", sub: "pod", icon: "pod", tone: "teal", variant: "glyph", x: 345, y: 462 },
    { id: "app2", label: "search", sub: "pod", icon: "pod", tone: "neutral", variant: "glyph", x: 455, y: 462 },
    { id: "web3", label: "shop-web", sub: "pod", icon: "pod", tone: "teal", variant: "glyph", x: 610, y: 462 },
    { id: "app3", label: "checkout", sub: "pod", icon: "pod", tone: "neutral", variant: "glyph", x: 720, y: 462 },
  ],
  edges: [
    { from: "you", to: "api", label: "3 copies", packet: true },
    { from: "api", to: "store", label: "save", packet: true, delay: 0.8 },
    { from: "controllers", to: "api", label: "watch, fix", dashed: true, flow: true, bidirectional: true },
    { from: "scheduler", to: "api", label: "pod → node", dashed: true, flow: true, bidirectional: true },

    {
      from: "api",
      to: "kubelet1",
      via: [
        [340, BEND],
        [130, BEND],
      ],
      packet: true,
      delay: 1.6,
    },
    { from: "api", to: "kubelet2", label: "run these pods", packet: true, delay: 1.6 },
    {
      from: "api",
      to: "kubelet3",
      via: [
        [460, BEND],
        [665, BEND],
      ],
      packet: true,
      delay: 1.6,
    },

    { from: "kubelet1", to: "web1", label: "starts", labelAt: 0.4 },
    { from: "kubelet1", to: "app1" },
    { from: "kubelet2", to: "web2" },
    { from: "kubelet2", to: "app2" },
    { from: "kubelet3", to: "web3" },
    { from: "kubelet3", to: "app3" },
  ],
};

export default spec;
