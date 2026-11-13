import type { DiagramSpec } from "@/components/diagrams/types";

// What a virtual machine is made of (cloud/compute/virtual-machines).
// Step 1: one physical host. A hypervisor cuts it into three VMs: Brightpost's app server, another tenant's VM and
// a noisy neighbour that keeps the shared hardware busy. Step 2: Brightpost's VM opened up into its parts: virtual
// processors, memory and a network card on the top row; a data disk, the boot disk and a local disk on the bottom
// row. The boot disk is copied from an image when the VM is created.
//
// Nodes never move between steps. Layout: two stacked zones, three columns (centres x 175, 425, 675).
//   Host zone y 40-285: VMs on row y 115, hypervisor on row y 225 under the middle VM.
//   VM zone y 330-630: processors, memory, network card on row y 400; disks on row y 560.
//   Images zone y 655-785: the image glyph at 425,715, straight under the boot disk.
// The "opened up" edge runs straight down at x 175, right of the VM zone's tab (which ends near x 166).
// The image edge runs straight up at x 425, right of the Images zone's tab (which ends near x 393).
//
// Why this order: on a phone the figure opens on the left ~480 units, so Brightpost's VM, the second tenant and most
// of the hypervisor show without scrolling. The canvas stays under 800 wide for the 660 px article column.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Nodes are 200 wide,
// sized for the longest name the Services toggle shows ("Azure Managed Disks", "Network interface").
const disk = {
  aws: "aws-ebs",
  gcp: { id: "gcp-persistent-disk", label: "Persistent Disk" },
  azure: "azure-managed-disks",
} as const;

const spec: DiagramSpec = {
  title: "A virtual machine: a slice of a host, and what the slice holds",
  width: 790,
  height: 790,
  steps: [{ title: "A hypervisor cuts one host into VMs" }, { title: "Inside one VM" }],
  zones: [
    { id: "host", title: "Physical host", tone: "neutral", x: 15, y: 40, w: 770, h: 245 },
    { id: "vm", title: "Inside the VM", tone: "teal", x: 15, y: 330, w: 770, h: 300 },
    { id: "images", title: "Images", tone: "violet", x: 300, y: 655, w: 250, h: 130 },
  ],
  nodes: [
    // Step 1: the host and its tenants
    {
      id: "vm-shop",
      label: "Brightpost VM",
      sub: "4 vCPU, 16 GB",
      icon: "server",
      tone: "teal",
      accent: true,
      x: 175,
      y: 115,
      w: 200,
      cloud: {
        aws: "aws-ec2",
        gcp: "gcp-compute-engine",
        azure: { id: "azure-vm", label: "Azure VM" },
      },
    },
    {
      id: "vm-b",
      label: "Another tenant",
      sub: "own OS, own disks",
      icon: "server",
      tone: "neutral",
      x: 425,
      y: 115,
      w: 200,
    },
    {
      id: "vm-c",
      label: "Noisy neighbour",
      sub: "busy all day",
      icon: "server",
      tone: "orange",
      x: 675,
      y: 115,
      w: 200,
    },
    {
      id: "hyp",
      label: "Hypervisor",
      sub: "cuts the host into VMs and keeps them apart",
      icon: "layers",
      tone: "neutral",
      x: 425,
      y: 225,
      w: 330,
      h: 54,
    },

    // Step 2: the parts of Brightpost's VM
    {
      id: "vcpu",
      label: "vCPU ×4",
      sub: "threads of real cores",
      icon: "cpu",
      tone: "teal",
      step: 2,
      x: 175,
      y: 400,
      w: 200,
    },
    {
      id: "memory",
      label: "Memory 16 GB",
      sub: "wiped when it stops",
      icon: "binary",
      tone: "teal",
      step: 2,
      x: 425,
      y: 400,
      w: 200,
    },
    {
      id: "nic",
      label: "Network card",
      sub: "private IP 10.0.1.12",
      icon: "network",
      tone: "blue",
      step: 2,
      x: 675,
      y: 400,
      w: 200,
      cloud: {
        aws: { label: "ENI" },
        gcp: { label: "Network interface" },
        azure: { label: "Network interface" },
      },
    },
    {
      id: "data",
      label: "Data disk",
      sub: "attached, can move",
      icon: "disk",
      tone: "violet",
      step: 2,
      x: 175,
      y: 560,
      w: 200,
      cloud: disk,
    },
    {
      id: "boot",
      label: "Boot disk",
      sub: "OS and app, 30 GB",
      icon: "disk",
      tone: "violet",
      step: 2,
      x: 425,
      y: 560,
      w: 200,
      cloud: disk,
    },
    {
      id: "local",
      label: "Local disk",
      sub: "fast, erased on stop",
      icon: "hard-drive",
      tone: "violet",
      step: 2,
      x: 675,
      y: 560,
      w: 200,
      cloud: {
        aws: { label: "Instance store" },
        gcp: { label: "Local SSD" },
        azure: { label: "Temporary disk" },
      },
    },
    {
      id: "image",
      label: "Image",
      sub: "the disk to copy",
      icon: "image",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 425,
      y: 715,
      cloud: {
        aws: { label: "AMI" },
        gcp: { label: "Custom image" },
        azure: { label: "Gallery image" },
      },
    },
  ],
  edges: [
    // Step 1: the hypervisor hands each VM its share of one machine.
    { from: "hyp", to: "vm-shop", label: "its share", labelAt: 0.55 },
    { from: "hyp", to: "vm-b" },
    { from: "hyp", to: "vm-c", label: "same hardware", tone: "orange", labelAt: 0.55 },

    // Step 2: open Brightpost's VM; its boot disk is a copy of an image.
    { from: "vm-shop", to: "vcpu", label: "opened up", dashed: true, step: 2 },
    { from: "image", to: "boot", label: "copied at create", packet: true, step: 2 },
  ],
};

export default spec;
