import type { DiagramSpec } from "@/components/diagrams/types";

// From one VM to a fleet across three zones, told as Brightpost's spring sale (cloud/compute/virtual-machines).
// Step 1: one app server boots from a plain OS image; a start-up script downloads the shop's packages from a public
// package mirror. Step 2: a VM group copies a VM template into one server per zone, behind a load balancer that
// spans the three zones. Step 3 (the failure step): at 9:02 on sale day the group adds 5 servers; each one waits on
// the slow mirror, takes 11 minutes to be ready, and the load balancer keeps them out of service. Step 4: an image
// build installs the packages once into a golden image, v12, and the template points to it. Step 5: new servers boot
// from v12 and join the load balancer about 3 minutes later.
//
// Nodes never move between steps. The boot-time download is not a node: it is the step-1 edge from the mirror
// (`until: 1`) and the three red step-3 edges (`until: 3`). The step-3 "not ready" edges and the step-5 "in service"
// edges are twins on the same lines; only the middle one of each set carries a label.
//
// Layout: the London region (x 10-535) holds three zones drawn as side-by-side bands (subnet kind, inline label).
// Inside each band: a server on row y 300 and a sale-day server on row y 520. The load balancer is one wide node on
// row y 420 across all three bands, because a regional load balancer serves every zone, so its edges fan up to the
// servers and down to the new ones without crossing a box. Shoppers sit above the gap between zones A and B, and
// their edge runs straight down that gap (x 185) into the load balancer. The public mirror sits below the region,
// centred under zone B, so its edges fan up into the three bands.
//   Right column (x 555-790): "Fleet settings" (VM group 672,300; VM template 672,410) and "Images" (golden image
//   672,545; image build 672,690). Their vertical edges run at x 672, right of both zone tabs.
//
// Why this order: on a phone the figure opens on the left ~480 units. Steps 1 and 3 happen in zones A and B and the
// mirror below them, so the first step and the failure show without scrolling. Canvas 795 wide, under 800.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. The servers use short
// toggle names ("EC2 instance", "VM instance", "Azure VM") to fit 150-wide bands; the right column is 224 wide for
// "Managed instance group". The "adds 5" edge bends at 545,330 in the gutter so it passes left of the template.
const vm = {
  aws: { id: "aws-ec2", label: "EC2 instance" },
  gcp: { id: "gcp-compute-engine", label: "VM instance" },
  azure: { id: "azure-vm", label: "Azure VM" },
} as const;

const spec: DiagramSpec = {
  title: "From one VM set up at boot to a fleet built from a baked image",
  width: 795,
  height: 745,
  steps: [
    { title: "One server, set up at boot" },
    { title: "A group of servers in three zones" },
    { title: "Sale day: new servers take 11 minutes" },
    { title: "Bake the packages into an image" },
    { title: "New servers ready in 3 minutes" },
  ],
  zones: [
    { id: "region", title: "London region", tone: "neutral", kind: "region", x: 10, y: 215, w: 525, h: 390 },
    { id: "zone-a", title: "Zone A", tone: "blue", kind: "subnet", x: 20, y: 240, w: 160, h: 355 },
    { id: "zone-b", title: "Zone B", tone: "blue", kind: "subnet", x: 190, y: 240, w: 160, h: 355 },
    { id: "zone-c", title: "Zone C", tone: "blue", kind: "subnet", x: 360, y: 240, w: 165, h: 355 },
    { id: "internet", title: "Public internet", tone: "neutral", kind: "subnet", x: 10, y: 628, w: 525, h: 105 },
    { id: "fleet", title: "Fleet settings", tone: "teal", x: 555, y: 228, w: 235, h: 237 },
    { id: "images", title: "Images", tone: "violet", x: 555, y: 492, w: 235, h: 241 },
  ],
  nodes: [
    // Step 1
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "1,500 at 9:05",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 185,
      y: 62,
    },
    {
      id: "server-a",
      label: "App server",
      sub: "zone A",
      icon: "server",
      tone: "teal",
      x: 100,
      y: 300,
      w: 150,
      cloud: vm,
    },
    {
      id: "mirror",
      label: "Package mirror",
      sub: "outside the cloud",
      icon: "globe",
      tone: "neutral",
      x: 270,
      y: 690,
      w: 160,
    },

    // Step 2
    {
      id: "lb",
      label: "Load balancer",
      sub: "spans the three zones",
      icon: "load-balancer",
      tone: "blue",
      step: 2,
      x: 270,
      y: 420,
      w: 400,
      h: 54,
      cloud: { aws: "aws-elb", gcp: "gcp-cloud-load-balancing", azure: "azure-app-gateway" },
    },
    {
      id: "server-b",
      label: "App server",
      sub: "zone B",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 270,
      y: 300,
      w: 150,
      cloud: vm,
    },
    {
      id: "server-c",
      label: "App server",
      sub: "zone C",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 442,
      y: 300,
      w: 150,
      cloud: vm,
    },
    {
      id: "group",
      label: "VM group",
      sub: "runs 3 now, at most 10",
      icon: "workers",
      tone: "teal",
      step: 2,
      x: 672,
      y: 300,
      w: 224,
      h: 54,
      cloud: {
        aws: { label: "Auto Scaling group" },
        gcp: { label: "Managed instance group" },
        azure: { label: "VM Scale Set" },
      },
    },
    {
      id: "template",
      label: "VM template",
      sub: "image, size, script",
      icon: "file",
      tone: "teal",
      step: 2,
      x: 672,
      y: 410,
      w: 224,
      h: 54,
      cloud: {
        aws: { label: "Launch template" },
        gcp: { label: "Instance template" },
        azure: { label: "Scale set model" },
      },
    },

    // Step 3: the failure
    {
      id: "new-a",
      label: "New server",
      sub: "added at 9:02",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 100,
      y: 520,
      w: 150,
      cloud: vm,
    },
    {
      id: "new-b",
      label: "New server",
      sub: "added at 9:02",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 270,
      y: 520,
      w: 150,
      cloud: vm,
    },
    {
      id: "new-c",
      label: "New server",
      sub: "added at 9:02",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 442,
      y: 520,
      w: 150,
      cloud: vm,
    },

    // Step 4
    {
      id: "golden",
      label: "Golden image",
      sub: "v12, packages inside",
      icon: "image",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 672,
      y: 545,
      cloud: {
        aws: { label: "AMI" },
        gcp: { label: "Custom image" },
        azure: { label: "Gallery image" },
      },
    },
    {
      id: "build",
      label: "Image build",
      sub: "installs packages once",
      icon: "pipeline",
      tone: "orange",
      step: 4,
      x: 672,
      y: 690,
      w: 224,
      h: 54,
      cloud: {
        aws: { label: "EC2 Image Builder" },
        gcp: { id: "gcp-cloud-build", label: "Cloud Build" },
        azure: { label: "VM Image Builder" },
      },
    },
  ],
  edges: [
    // Step 1: shoppers reach the one server; at boot it downloads its packages from the internet.
    { from: "shoppers", to: "server-a", label: "orders", packet: true, via: [[185, 195]], labelAt: 0.35, until: 1 },
    { from: "mirror", to: "server-a", label: "packages at boot", packet: true, delay: 0.6, until: 1 },

    // Step 2: one front door for three zones; the group keeps one copy of the template in each zone.
    {
      from: "shoppers",
      to: "lb",
      label: "HTTPS",
      packet: true,
      via: [[185, 380]],
      labelAt: 0.18,
      step: 2,
    },
    { from: "lb", to: "server-a", packet: true, delay: 1, step: 2 },
    { from: "lb", to: "server-b", label: "healthy only", packet: true, delay: 1, step: 2 },
    { from: "lb", to: "server-c", packet: true, delay: 1, step: 2 },
    { from: "template", to: "group", label: "copies", dashed: true, step: 2 },
    { from: "group", to: "server-c", dashed: true, step: 2 },

    // Step 3: the group adds 5 servers; each waits 11 minutes on the slow mirror and is kept out of service.
    { from: "group", to: "new-c", label: "adds 5", dashed: true, via: [[545, 330]], labelAt: 0.55, step: 3 },
    { from: "mirror", to: "new-a", tone: "red", packet: true, duration: 6, step: 3, until: 3 },
    { from: "mirror", to: "new-b", label: "slow: 11 min", tone: "red", packet: true, duration: 6, step: 3, until: 3 },
    { from: "mirror", to: "new-c", tone: "red", packet: true, duration: 6, step: 3, until: 3 },
    { from: "lb", to: "new-a", tone: "red", dashed: true, step: 3, until: 3 },
    { from: "lb", to: "new-b", label: "not ready", tone: "red", dashed: true, step: 3, until: 3 },
    { from: "lb", to: "new-c", tone: "red", dashed: true, step: 3, until: 3 },

    // Step 4: the mirror is used once, at build time; the template now names the golden image.
    { from: "mirror", to: "build", label: "packages, once", packet: true, step: 4 },
    { from: "build", to: "golden", label: "bakes v12", packet: true, delay: 1.2, step: 4 },
    { from: "golden", to: "template", label: "uses v12", dashed: true, step: 4 },

    // Step 5: new servers boot from v12 and pass the health check about 3 minutes later.
    { from: "golden", to: "new-c", label: "boots: 3 min", packet: true, step: 5 },
    { from: "lb", to: "new-a", tone: "green", packet: true, delay: 1, step: 5 },
    { from: "lb", to: "new-b", label: "in at 9:05", tone: "green", packet: true, delay: 1, step: 5 },
    { from: "lb", to: "new-c", tone: "green", packet: true, delay: 1, step: 5 },
  ],
};

export default spec;
