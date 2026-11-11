import type { Owner, ResponsibilityLayer, ResponsibilityOption, ResponsibilitySet } from "./types";

// Who runs what, one set per <ResponsibilityGrid set="…" />. Columns go from "most of the work is yours" (left) to
// "the cloud does most of it" (right); rows go from what is always yours (top) down to what the cloud owns.
//
// Owners: "you" = you build and run it; "shared" = you choose the setting and the cloud carries it out;
// "provider" = the cloud does it without being asked. Where the three clouds differ, the cell shows the answer that
// asks more of you, so nobody skips a job that is theirs on their cloud.

/** Short form for one column: the owners in the order of the set's layers. */
function column(
  layers: ResponsibilityLayer[],
  id: string,
  label: string,
  sub: string,
  owners: Owner[]
): ResponsibilityOption {
  if (owners.length !== layers.length) throw new Error(`responsibility option "${id}": one owner per layer`);
  return { id, label, sub, owners: Object.fromEntries(layers.map((l, i) => [l.id, owners[i]])) };
}

// The three per-cloud compute grids share these layers so they can be compared side by side.
const COMPUTE_LAYERS: ResponsibilityLayer[] = [
  { id: "code", label: "Your code and image" },
  { id: "scaling", label: "Scaling rules" },
  { id: "upgrades", label: "Runtime / version upgrades" },
  { id: "orchestrator", label: "Scheduler / control plane" },
  { id: "capacity", label: "Servers and capacity" },
  { id: "os", label: "OS patching and images" },
];

const COMPUTE_TITLE = "Who runs what";
const COMPUTE_ARIA = "Who runs each layer for each compute option";
const COMPUTE_CAPTION = "Moving right trades control for less operational work. Your code is always yours.";

const SERVICE_MODEL_LAYERS: ResponsibilityLayer[] = [
  { id: "data", label: "Your data" },
  { id: "access", label: "Identity and access rules" },
  { id: "code", label: "Application code" },
  { id: "runtime", label: "Runtime and middleware" },
  { id: "os", label: "Operating system" },
  { id: "virtualisation", label: "Virtualisation" },
  { id: "physical", label: "Building and hardware" },
];

const KUBERNETES_LAYERS: ResponsibilityLayer[] = [
  { id: "images", label: "Your images" },
  { id: "manifests", label: "Pod specs and manifests" },
  { id: "ingress", label: "Network add-ons, ingress" },
  { id: "node-scaling", label: "Node scaling" },
  { id: "upgrades", label: "Cluster upgrades" },
  { id: "nodes", label: "Worker nodes and OS" },
  { id: "control-plane", label: "Control plane" },
];

const NETWORK_SECURITY_LAYERS: ResponsibilityLayer[] = [
  { id: "firewall", label: "Firewall rules" },
  { id: "isolation", label: "Virtual network isolation" },
  { id: "transit", label: "Encryption in transit" },
  { id: "appliances", label: "Network appliance patching" },
  { id: "ddos", label: "DDoS absorption at the edge" },
  { id: "physical", label: "Physical network" },
];

const OBJECT_STORAGE_LAYERS: ResponsibilityLayer[] = [
  { id: "classification", label: "Data classification" },
  { id: "access", label: "Access policies, public access" },
  { id: "lifecycle", label: "Lifecycle and tiering rules" },
  { id: "versioning", label: "Versioning and backup" },
  { id: "encryption", label: "Encryption at rest (default)" },
  { id: "durability", label: "Durability and replication" },
];

const DATABASE_LAYERS: ResponsibilityLayer[] = [
  { id: "schema", label: "Schema and queries" },
  { id: "access", label: "Access control" },
  { id: "backups", label: "Backups" },
  { id: "scaling", label: "Scaling" },
  { id: "failover", label: "Failover" },
  { id: "engine", label: "Engine install and patching" },
  { id: "servers", label: "Servers and OS" },
];

const HA_LAYERS: ResponsibilityLayer[] = [
  { id: "testing", label: "Testing the failover" },
  { id: "capacity", label: "Capacity during failure" },
  { id: "health", label: "Health checks" },
  { id: "placement", label: "Replica placement in zones" },
  { id: "failover", label: "Failover" },
];

const ENCRYPTION_LAYERS: ResponsibilityLayer[] = [
  { id: "policy", label: "Access policy on keys" },
  { id: "audit", label: "Audit of key use" },
  { id: "rotation", label: "Rotation" },
  { id: "generation", label: "Key generation" },
  { id: "storage", label: "Key storage" },
  { id: "encrypting", label: "Encrypting the data" },
];

const PATCHING_LAYERS: ResponsibilityLayer[] = [
  { id: "dependencies", label: "Dependency updates in code" },
  { id: "rollout", label: "Emergency fix rollout" },
  { id: "base-images", label: "Base images" },
  { id: "runtime", label: "Runtime patches" },
  { id: "os", label: "OS patches" },
];

export const RESPONSIBILITY_SETS: Record<string, ResponsibilitySet> = {
  "aws-compute": {
    title: COMPUTE_TITLE,
    ariaLabel: COMPUTE_ARIA,
    caption: COMPUTE_CAPTION,
    layers: COMPUTE_LAYERS,
    options: [
      column(COMPUTE_LAYERS, "ec2", "EC2", "+ Auto Scaling", ["you", "you", "you", "you", "shared", "you"]),
      column(COMPUTE_LAYERS, "ecs-ec2", "ECS on EC2", "your instances", [
        "you",
        "shared",
        "shared",
        "provider",
        "shared",
        "you",
      ]),
      column(COMPUTE_LAYERS, "eks", "EKS", "managed node groups", [
        "you",
        "you",
        "you",
        "provider",
        "shared",
        "shared",
      ]),
      column(COMPUTE_LAYERS, "eks-auto", "EKS Auto Mode", "AWS runs nodes", [
        "you",
        "shared",
        "shared",
        "provider",
        "provider",
        "provider",
      ]),
      column(COMPUTE_LAYERS, "fargate", "ECS on Fargate", "no hosts", [
        "you",
        "shared",
        "provider",
        "provider",
        "provider",
        "provider",
      ]),
      column(COMPUTE_LAYERS, "lambda", "Lambda", "functions", [
        "you",
        "provider",
        "shared",
        "provider",
        "provider",
        "provider",
      ]),
    ],
  },

  "gcp-compute": {
    title: COMPUTE_TITLE,
    ariaLabel: COMPUTE_ARIA,
    caption: COMPUTE_CAPTION,
    layers: COMPUTE_LAYERS,
    options: [
      column(COMPUTE_LAYERS, "mig", "Compute Engine", "instance group", ["you", "you", "you", "you", "shared", "you"]),
      // Release channels upgrade the control plane and node pools on a schedule you steer; node images are Google's.
      column(COMPUTE_LAYERS, "gke-standard", "GKE Standard", "your node pools", [
        "you",
        "you",
        "shared",
        "provider",
        "shared",
        "shared",
      ]),
      column(COMPUTE_LAYERS, "gke-autopilot", "GKE Autopilot", "Google runs nodes", [
        "you",
        "shared",
        "shared",
        "provider",
        "provider",
        "provider",
      ]),
      column(COMPUTE_LAYERS, "cloud-run", "Cloud Run", "no cluster", [
        "you",
        "shared",
        "provider",
        "provider",
        "provider",
        "provider",
      ]),
      column(COMPUTE_LAYERS, "functions", "Cloud Run functions", "functions", [
        "you",
        "provider",
        "shared",
        "provider",
        "provider",
        "provider",
      ]),
    ],
  },

  "azure-compute": {
    title: COMPUTE_TITLE,
    ariaLabel: COMPUTE_ARIA,
    caption: COMPUTE_CAPTION,
    layers: COMPUTE_LAYERS,
    options: [
      column(COMPUTE_LAYERS, "vmss", "VM Scale Sets", "your VMs", ["you", "you", "you", "you", "shared", "you"]),
      column(COMPUTE_LAYERS, "aks", "AKS", "your node pools", ["you", "you", "you", "provider", "shared", "shared"]),
      column(COMPUTE_LAYERS, "aks-automatic", "AKS Automatic", "Azure runs nodes", [
        "you",
        "shared",
        "shared",
        "provider",
        "provider",
        "provider",
      ]),
      column(COMPUTE_LAYERS, "container-apps", "Container Apps", "no cluster", [
        "you",
        "shared",
        "provider",
        "provider",
        "provider",
        "provider",
      ]),
      // You still pick and pay for the plan (size and instance count), and the language stack version.
      column(COMPUTE_LAYERS, "app-service", "App Service", "code on a plan", [
        "you",
        "shared",
        "shared",
        "provider",
        "shared",
        "provider",
      ]),
      column(COMPUTE_LAYERS, "functions", "Functions", "functions", [
        "you",
        "provider",
        "shared",
        "provider",
        "provider",
        "provider",
      ]),
    ],
  },

  "shared-responsibility": {
    title: "Who is responsible for what",
    ariaLabel: "Who is responsible for each layer under each service model",
    caption:
      "Moving right hands more layers to the provider. Your data and who may reach it stay your job in every column.",
    layers: SERVICE_MODEL_LAYERS,
    options: [
      column(SERVICE_MODEL_LAYERS, "on-prem", "On-premises", "your data centre", [
        "you",
        "you",
        "you",
        "you",
        "you",
        "you",
        "you",
      ]),
      // From here on the provider runs the identity system; writing the rules stays with you.
      column(SERVICE_MODEL_LAYERS, "iaas", "Virtual machines", "IaaS", [
        "you",
        "shared",
        "you",
        "you",
        "you",
        "provider",
        "provider",
      ]),
      column(SERVICE_MODEL_LAYERS, "paas", "Managed platform", "PaaS", [
        "you",
        "shared",
        "you",
        "shared",
        "provider",
        "provider",
        "provider",
      ]),
      column(SERVICE_MODEL_LAYERS, "functions", "Functions", "serverless", [
        "you",
        "shared",
        "you",
        "shared",
        "provider",
        "provider",
        "provider",
      ]),
      column(SERVICE_MODEL_LAYERS, "saas", "SaaS", "a finished app", [
        "you",
        "shared",
        "provider",
        "provider",
        "provider",
        "provider",
        "provider",
      ]),
    ],
  },

  kubernetes: {
    title: "Who runs the cluster",
    ariaLabel: "Who runs each part of a Kubernetes cluster for each way of running it",
    caption: "Moving right, the cloud takes over more of the cluster. Images and workload specs stay yours.",
    layers: KUBERNETES_LAYERS,
    options: [
      column(KUBERNETES_LAYERS, "self-managed", "Self-managed", "Kubernetes on VMs", [
        "you",
        "you",
        "you",
        "you",
        "you",
        "you",
        "you",
      ]),
      column(KUBERNETES_LAYERS, "managed", "Managed cluster", "your node pools", [
        "you",
        "you",
        "shared",
        "shared",
        "shared",
        "shared",
        "provider",
      ]),
      column(KUBERNETES_LAYERS, "hands-off", "Hands-off nodes", "cloud runs nodes", [
        "you",
        "you",
        "shared",
        "provider",
        "shared",
        "provider",
        "provider",
      ]),
      // No cluster to see: the service definition replaces most of the manifests, but writing it is still yours.
      column(KUBERNETES_LAYERS, "serverless", "Serverless", "containers, no cluster", [
        "you",
        "you",
        "provider",
        "provider",
        "provider",
        "provider",
        "provider",
      ]),
    ],
  },

  "network-security": {
    title: "Who sets and enforces each control",
    ariaLabel: "Who sets and enforces each network security control for each kind of resource",
    caption: "Managed services move enforcement to the cloud. Deciding who may connect stays with you.",
    layers: NETWORK_SECURITY_LAYERS,
    options: [
      column(NETWORK_SECURITY_LAYERS, "vm", "VM", "in your network", [
        "you",
        "shared",
        "you",
        "you",
        "shared",
        "provider",
      ]),
      column(NETWORK_SECURITY_LAYERS, "load-balancer", "Load balancer", "managed", [
        "shared",
        "shared",
        "shared",
        "provider",
        "provider",
        "provider",
      ]),
      column(NETWORK_SECURITY_LAYERS, "database", "Database", "managed", [
        "shared",
        "shared",
        "shared",
        "provider",
        "provider",
        "provider",
      ]),
      // Runs in the provider's network unless you attach it to yours; its HTTPS endpoint comes with a certificate.
      column(NETWORK_SECURITY_LAYERS, "function", "Function", "serverless", [
        "shared",
        "provider",
        "provider",
        "provider",
        "provider",
        "provider",
      ]),
    ],
  },

  "object-storage": {
    title: "Who looks after stored files",
    ariaLabel: "Who handles each storage control for each way of storing files",
    caption:
      "The store keeps objects safe from hardware failure. Where copies live, who can read them and how long they stay are settings you own.",
    layers: OBJECT_STORAGE_LAYERS,
    options: [
      column(OBJECT_STORAGE_LAYERS, "file-server", "File server", "self-run on VMs", [
        "you",
        "you",
        "you",
        "you",
        "shared",
        "you",
      ]),
      column(OBJECT_STORAGE_LAYERS, "file-share", "File share", "managed NFS / SMB", [
        "you",
        "shared",
        "shared",
        "shared",
        "shared",
        "shared",
      ]),
      column(OBJECT_STORAGE_LAYERS, "object-store", "Object store", "managed buckets", [
        "you",
        "shared",
        "shared",
        "shared",
        "provider",
        "provider",
      ]),
    ],
  },

  databases: {
    title: "Who runs the database",
    ariaLabel: "Who runs each part of a database for each way of running it",
    caption: "Moving right removes servers, patching and failover from your list. Schema, queries and access stay.",
    layers: DATABASE_LAYERS,
    options: [
      column(DATABASE_LAYERS, "self-managed", "Self-managed", "engine on VMs", [
        "you",
        "you",
        "you",
        "you",
        "you",
        "you",
        "you",
      ]),
      column(DATABASE_LAYERS, "managed", "Managed instance", "e.g. PostgreSQL", [
        "you",
        "you",
        "shared",
        "shared",
        "shared",
        "shared",
        "provider",
      ]),
      // Access is written as cloud permissions the provider enforces; point-in-time recovery is usually a switch.
      column(DATABASE_LAYERS, "serverless", "Serverless", "no instances", [
        "you",
        "shared",
        "shared",
        "provider",
        "provider",
        "provider",
        "provider",
      ]),
    ],
  },

  "ha-controls": {
    title: "Who keeps it available",
    ariaLabel: "Who handles each high-availability control for each kind of workload",
    caption:
      "The cloud fails over for you only where you asked for a second zone. Proving that it works is always your job.",
    layers: HA_LAYERS,
    options: [
      column(HA_LAYERS, "vms", "VMs", "behind a load balancer", ["you", "you", "shared", "shared", "shared"]),
      column(HA_LAYERS, "managed-db", "Managed database", "multi-zone option", [
        "you",
        "shared",
        "provider",
        "shared",
        "provider",
      ]),
      column(HA_LAYERS, "serverless", "Serverless", "functions, containers", [
        "you",
        "provider",
        "provider",
        "provider",
        "provider",
      ]),
    ],
  },

  "encryption-controls": {
    title: "Who controls the keys",
    ariaLabel: "Who handles each part of encryption at rest for each kind of key",
    caption: "More control over keys means more work, and a lost or blocked key makes the data unreadable.",
    layers: ENCRYPTION_LAYERS,
    options: [
      column(ENCRYPTION_LAYERS, "provider-managed", "Provider keys", "default encryption", [
        "provider",
        "provider",
        "provider",
        "provider",
        "provider",
        "provider",
      ]),
      column(ENCRYPTION_LAYERS, "customer-managed", "Your keys in KMS", "customer-managed", [
        "shared",
        "shared",
        "shared",
        "shared",
        "provider",
        "provider",
      ]),
      column(ENCRYPTION_LAYERS, "external", "External keys", "held outside the cloud", [
        "you",
        "you",
        "you",
        "you",
        "you",
        "provider",
      ]),
    ],
  },

  patching: {
    title: "Who patches what",
    ariaLabel: "Who patches each layer for each way of running code",
    caption: "The less of the stack you ship, the less you patch. Dependencies in your own code are always yours.",
    layers: PATCHING_LAYERS,
    options: [
      column(PATCHING_LAYERS, "vms", "VMs", "your images", ["you", "you", "you", "you", "you"]),
      // The cloud publishes patched node images; you allow or schedule the node upgrade and rebuild your containers.
      column(PATCHING_LAYERS, "kubernetes", "Managed Kubernetes", "your containers", [
        "you",
        "shared",
        "you",
        "you",
        "shared",
      ]),
      column(PATCHING_LAYERS, "serverless-containers", "Serverless containers", "your image", [
        "you",
        "shared",
        "you",
        "you",
        "provider",
      ]),
      column(PATCHING_LAYERS, "functions", "Functions", "code only", [
        "you",
        "shared",
        "provider",
        "shared",
        "provider",
      ]),
    ],
  },
};
