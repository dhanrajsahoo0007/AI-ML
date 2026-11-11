// AWS, Google Cloud and Azure services, grouped by job. Single source of truth for the widgets in
// src/components/cloud: the group tables, the service profiles, the responsibility grid and the decision trees all
// read from here, so a fact fixed once is fixed on every provider page.
//
// Equivalence lives on capabilities, not on service pairs: a capability such as "Managed Kubernetes" names the
// service(s) on each cloud and how well each covers the job. That keeps the three columns consistent and means a
// GCP-first or Azure-first page is the same data sorted differently.
//
// Facts were checked against provider docs and announcements in November 2026 (`VERIFIED`). Prices are list prices
// in US regions and only appear where they change a design decision.

import type { Capability, CloudService, DecisionTree, Fit, GroupId, Owner, ProviderId } from "./cloud-data/types";
import { TREES } from "./cloud-data/decision-trees";
import * as compute from "./cloud-data/compute";
import * as containers from "./cloud-data/containers";
import * as serverless from "./cloud-data/serverless";
import * as networking from "./cloud-data/networking";
import * as edge from "./cloud-data/edge";
import * as storage from "./cloud-data/storage";
import * as databases from "./cloud-data/databases";
import * as caching from "./cloud-data/caching";
import * as messaging from "./cloud-data/messaging";
import * as analytics from "./cloud-data/analytics";
import * as security from "./cloud-data/security";
import * as observability from "./cloud-data/observability";
import * as devops from "./cloud-data/devops";
import * as aiml from "./cloud-data/ai-ml";

export type {
  Capability,
  CloudService,
  DecisionTree,
  Fit,
  GroupId,
  Owner,
  ProviderAnswer,
  ProviderId,
  ResponsibilityLayer,
  ResponsibilityOption,
  ResponsibilitySet,
  TreeOption,
  TreeQuestion,
  TreeResult,
} from "./cloud-data/types";
export { RESPONSIBILITY_SETS } from "./cloud-data/responsibility-sets";

export const VERIFIED = "November 2026";

export const PROVIDERS: { id: ProviderId; name: string; short: string }[] = [
  { id: "aws", name: "Amazon Web Services", short: "AWS" },
  { id: "gcp", name: "Google Cloud", short: "GCP" },
  { id: "azure", name: "Microsoft Azure", short: "Azure" },
];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<
  ProviderId,
  (typeof PROVIDERS)[number]
>;

export interface CloudGroup {
  id: GroupId;
  title: string;
  icon: string;
  blurb: string;
  /** Headline services per provider, for hub cards and outline pages. */
  headline: Record<ProviderId, string>;
}

export const GROUPS: CloudGroup[] = [
  {
    id: "compute",
    title: "Compute",
    icon: "cpu",
    blurb: "Virtual machines, autoscaling fleets, spot capacity, batch and PaaS on VMs.",
    headline: {
      aws: "EC2, Auto Scaling, Spot, Elastic Beanstalk, Batch",
      gcp: "Compute Engine, managed instance groups, Spot VMs, App Engine, Batch",
      azure: "Virtual Machines, VM Scale Sets, Spot VMs, App Service, Batch",
    },
  },
  {
    id: "containers",
    title: "Containers",
    icon: "container",
    blurb: "Orchestrators, managed Kubernetes, serverless containers and registries.",
    headline: {
      aws: "ECS, EKS, Fargate, ECS Express Mode, ECR",
      gcp: "GKE, GKE Autopilot, Cloud Run, Artifact Registry",
      azure: "AKS, AKS Automatic, Container Apps, Container Instances, ACR",
    },
  },
  {
    id: "serverless",
    title: "Serverless & Orchestration",
    icon: "zap",
    blurb: "Functions, workflows, event routers and API front doors.",
    headline: {
      aws: "Lambda, Step Functions, EventBridge, API Gateway",
      gcp: "Cloud Run functions, Workflows, Eventarc, API Gateway / Apigee",
      azure: "Functions, Logic Apps / Durable Functions, Event Grid, API Management",
    },
  },
  {
    id: "networking",
    title: "Networking",
    icon: "network",
    blurb: "Private networks, load balancers, private connectivity and hybrid links.",
    headline: {
      aws: "VPC, ALB / NLB, Transit Gateway, PrivateLink, Direct Connect",
      gcp: "VPC, Cloud Load Balancing, Network Connectivity Center, Private Service Connect, Interconnect",
      azure: "VNet, Application Gateway / Load Balancer, Virtual WAN, Private Link, ExpressRoute",
    },
  },
  {
    id: "edge",
    title: "Edge, DNS & CDN",
    icon: "globe",
    blurb: "DNS, content delivery and global traffic steering.",
    headline: {
      aws: "Route 53, CloudFront, Global Accelerator",
      gcp: "Cloud DNS, Cloud CDN, global external load balancer",
      azure: "Azure DNS, Front Door, Traffic Manager",
    },
  },
  {
    id: "storage",
    title: "Storage",
    icon: "hard-drive",
    blurb: "Object, block, file and archive storage, plus backup, bulk transfer and disaster-recovery replication.",
    headline: {
      aws: "S3, EBS, EFS, FSx, S3 Glacier, AWS Backup, DataSync",
      gcp: "Cloud Storage, Persistent Disk / Hyperdisk, Filestore, NetApp Volumes, Backup and DR",
      azure: "Blob Storage, Managed Disks, Azure Files, Azure NetApp Files, Azure Backup",
    },
  },
  {
    id: "databases",
    title: "Databases",
    icon: "database",
    blurb: "Relational, key-value, document, wide-column, graph, time-series and distributed SQL, plus migration tools.",
    headline: {
      aws: "RDS, Aurora, Aurora DSQL, DynamoDB, Keyspaces, DocumentDB, Neptune",
      gcp: "Cloud SQL, AlloyDB, Spanner, Firestore, Bigtable",
      azure: "Azure SQL, Azure Database for PostgreSQL / MySQL, Cosmos DB",
    },
  },
  {
    id: "caching",
    title: "Caching",
    icon: "gauge",
    blurb: "Managed Redis-compatible caches and in-memory databases.",
    headline: {
      aws: "ElastiCache (Valkey / Redis OSS / Memcached), MemoryDB, DAX",
      gcp: "Memorystore (Valkey / Redis / Memcached)",
      azure: "Azure Managed Redis, Azure Cache for Redis",
    },
  },
  {
    id: "messaging",
    title: "Messaging & Streaming",
    icon: "radio",
    blurb: "Queues, pub/sub topics, event streams and managed Kafka.",
    headline: {
      aws: "SQS, SNS, Kinesis, MSK, Amazon MQ, Firehose",
      gcp: "Pub/Sub, Cloud Tasks, Managed Service for Apache Kafka",
      azure: "Service Bus, Event Hubs, Queue Storage, Event Grid",
    },
  },
  {
    id: "analytics",
    title: "Analytics & Data",
    icon: "bar-chart",
    blurb: "Warehouses, query engines, Spark, ETL, stream processing, BI and data governance.",
    headline: {
      aws: "Redshift, Athena, EMR, Glue, Managed Flink, QuickSight",
      gcp: "BigQuery, Dataproc, Dataflow, Knowledge Catalog, Looker",
      azure: "Fabric, Synapse, Databricks, Data Factory, Stream Analytics, Power BI",
    },
  },
  {
    id: "security",
    title: "Identity & Security",
    icon: "shield",
    blurb: "Identity, keys and secrets, web application firewalls, threat detection and organisation guardrails.",
    headline: {
      aws: "IAM, Cognito, KMS, Secrets Manager, WAF, Shield, GuardDuty",
      gcp: "Cloud IAM, Identity Platform, Cloud KMS, Secret Manager, Cloud Armor",
      azure: "Entra ID, Key Vault, WAF, DDoS Protection, Defender for Cloud",
    },
  },
  {
    id: "observability",
    title: "Observability",
    icon: "activity",
    blurb: "Metrics, logs, traces and audit trails.",
    headline: {
      aws: "CloudWatch, X-Ray, CloudTrail, Managed Prometheus / Grafana",
      gcp: "Cloud Monitoring, Cloud Logging, Cloud Trace, Audit Logs",
      azure: "Azure Monitor, Application Insights, Log Analytics, Activity Log",
    },
  },
  {
    id: "devops",
    title: "DevOps & IaC",
    icon: "git-branch",
    blurb: "Infrastructure as code, build and deploy pipelines, migration planning and cost tools.",
    headline: {
      aws: "CloudFormation, CDK, CodePipeline, CodeBuild",
      gcp: "Infrastructure Manager, Cloud Build, Cloud Deploy",
      azure: "Bicep / ARM, Azure DevOps, GitHub Actions",
    },
  },
  {
    id: "ai-ml",
    title: "AI & ML",
    icon: "sparkles",
    blurb: "Foundation-model platforms, ML training and serving, and AI guardrails.",
    headline: {
      aws: "Bedrock, SageMaker AI",
      gcp: "Vertex AI",
      azure: "Azure AI Foundry, Azure Machine Learning",
    },
  },
];

export const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g])) as Record<GroupId, CloudGroup>;

// Services and capabilities, one module per group.
const DATA: Record<GroupId, { services: CloudService[]; capabilities: Capability[] }> = {
  compute: compute,
  containers: containers,
  serverless: serverless,
  networking: networking,
  edge: edge,
  storage: storage,
  databases: databases,
  caching: caching,
  messaging: messaging,
  analytics: analytics,
  security: security,
  observability: observability,
  devops: devops,
  "ai-ml": aiml,
};

export const FIT_LABEL: Record<Fit, string> = {
  direct: "Direct match",
  close: "Close match",
  partial: "Partial",
  none: "No equivalent",
};

// ---------------------------------------------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------------------------------------------

/**
 * The concept page that teaches the idea behind a group's services, used when a service does not name its own
 * `concept`. Groups whose services split across several pages (databases, security) have no default.
 */
const GROUP_CONCEPT: Partial<Record<GroupId, string>> = {
  compute: "/cloud/compute/virtual-machines",
  containers: "/cloud/compute/containers-and-registries",
  serverless: "/cloud/compute/serverless-functions",
  networking: "/cloud/networking/vpc-and-subnets",
  edge: "/cloud/networking/cdn-edge-and-waf",
  storage: "/cloud/data/object-storage",
  caching: "/cloud/data/managed-caches",
  messaging: "/cloud/data/streaming-and-messaging-services",
  analytics: "/cloud/data/warehouses-lakes-and-query-engines",
  observability: "/cloud/operations/observability-on-the-cloud",
  devops: "/cloud/operations/ci-cd-and-deployment-strategies",
  "ai-ml": "/cloud/operations/ai-ml-platforms-on-the-cloud",
};

/** A concept link is a page inside this section: /cloud/<hub>/<page>. */
const CONCEPT_PATH = /^\/cloud\/[a-z0-9-]+\/[a-z0-9-]+$/;

/** Fills in the group's default concept page and rejects a path that cannot be a cloud concept page. */
function withConcept(service: CloudService): CloudService {
  const concept = service.concept ?? GROUP_CONCEPT[service.group];
  if (concept === undefined) return service;
  if (!CONCEPT_PATH.test(concept)) {
    throw new Error(`cloud catalog: ${service.id} has concept "${concept}", expected /cloud/<hub>/<page>`);
  }
  return { ...service, concept };
}

export const SERVICES: CloudService[] = Object.values(DATA).flatMap((d) => d.services.map(withConcept));

export const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((s) => [s.id, s])) as Record<string, CloudService>;

// ---------------------------------------------------------------------------------------------------------------
// Capabilities: one row per job, with each cloud's answer
// ---------------------------------------------------------------------------------------------------------------

export const CAPABILITIES: Capability[] = Object.values(DATA).flatMap((d) => d.capabilities);

export function capabilitiesFor(group: GroupId) {
  return CAPABILITIES.filter((c) => c.group === group);
}

/** Capabilities a service appears in, its main job first, for "elsewhere" on a service profile. */
export function capabilitiesOfService(id: string) {
  const s = SERVICE_BY_ID[id];
  if (!s) return [];
  const caps = CAPABILITIES.filter((c) => c[s.provider].services.includes(id));
  return caps.sort((a, b) => Number(b.id === s.main) - Number(a.id === s.main));
}

// ---------------------------------------------------------------------------------------------------------------
// Who manages what: the sets behind <ResponsibilityGrid> live in ./cloud-data/responsibility-sets
// ---------------------------------------------------------------------------------------------------------------

export const OWNER_LABEL: Record<Owner, string> = {
  you: "You",
  shared: "You configure, cloud runs",
  provider: "Cloud provider",
};

// ---------------------------------------------------------------------------------------------------------------
// Decision trees. The two below were written for the AWS pages and name AWS services in their headlines; the
// cloud-neutral ones (database, storage, connectivity, load-balancer, dr-strategy) live in
// ./cloud-data/decision-trees.
// ---------------------------------------------------------------------------------------------------------------

export const DECISION_TREES: Record<string, DecisionTree> = {
  messaging: {
    title: "Messaging picker",
    start: "fate",
    questions: [
      {
        id: "fate",
        prompt: "What should happen to each message?",
        options: [
          {
            label: "One worker handles it, then it's gone",
            hint: "jobs: emails, thumbnails, payments to capture",
            next: "order",
          },
          {
            label: "Several services each react to it",
            hint: "OrderPlaced → billing, email, analytics",
            next: "fanout",
          },
          {
            label: "Many readers, in order, with replay",
            hint: "clickstreams, telemetry, a chat message bus",
            next: "stream",
          },
        ],
      },
      {
        id: "order",
        prompt: "Does order matter?",
        options: [
          { label: "No, just get the work done", hint: "each job is independent", next: "r-sqs" },
          { label: "Yes, per key", hint: "per order, per account, per conversation", next: "r-sqs-fifo" },
        ],
      },
      {
        id: "fanout",
        prompt: "How do subscribers pick their events?",
        options: [
          { label: "By type and content", hint: "many teams, AWS and SaaS sources", next: "r-eventbridge" },
          {
            label: "Each subscriber takes everything",
            hint: "high volume, simple fan-out to queues",
            next: "r-sns-sqs",
          },
        ],
      },
      {
        id: "stream",
        prompt: "Which kind of stream?",
        options: [
          { label: "Simplest managed stream", hint: "serverless, AWS-native consumers", next: "r-kinesis" },
          { label: "Kafka", hint: "Kafka clients, Connect, Streams, portability", next: "r-msk" },
        ],
      },
    ],
    results: [
      {
        id: "r-sqs",
        headline: "Amazon SQS (standard queue)",
        answer: {
          aws: ["aws-sqs"],
          gcp: ["gcp-pubsub", "gcp-cloud-tasks"],
          azure: ["azure-service-bus", "Queue Storage"],
        },
        why: "Absorbs bursts, scales without limits, and each message is processed by one consumer, with retries and a dead-letter queue.",
        tradeoff: "At-least-once and only roughly ordered, so consumers must be idempotent.",
      },
      {
        id: "r-sqs-fifo",
        headline: "SQS FIFO queue",
        answer: { aws: ["aws-sqs"], gcp: ["gcp-pubsub"], azure: ["azure-service-bus"] },
        why: "Messages with the same group id are delivered in order, one at a time, with deduplication; different groups run in parallel.",
        tradeoff: "Throughput is bounded per group, and one slow message blocks its group.",
      },
      {
        id: "r-eventbridge",
        headline: "Amazon EventBridge",
        answer: { aws: ["aws-eventbridge"], gcp: ["gcp-eventarc"], azure: ["azure-event-grid"] },
        why: "Producers publish business events once; each team adds a rule that matches the events it cares about, with no changes to the producer.",
        tradeoff: "No ordering or replay per key, and latency in the tens to hundreds of milliseconds.",
      },
      {
        id: "r-sns-sqs",
        headline: "SNS topic fanning out to SQS queues",
        answer: { aws: ["aws-sns", "aws-sqs"], gcp: ["gcp-pubsub"], azure: ["azure-service-bus"] },
        why: "Each consumer gets its own durable queue, so a slow or failing consumer never affects the others.",
        tradeoff: "One more hop and one more resource per subscriber; filtering is simpler than EventBridge rules.",
      },
      {
        id: "r-kinesis",
        headline: "Kinesis Data Streams",
        answer: { aws: ["aws-kinesis"], gcp: ["gcp-pubsub"], azure: ["azure-event-hubs"] },
        why: "Records with the same partition key stay in order on one shard; any number of consumers read at their own pace and can replay up to a year back.",
        tradeoff: "Shard limits per key, and you manage consumer checkpoints (or let Lambda do it).",
      },
      {
        id: "r-msk",
        headline: "Amazon MSK",
        answer: { aws: ["aws-msk"], gcp: ["gcp-managed-kafka"], azure: ["azure-event-hubs"] },
        why: "Real Kafka: consumer groups, compaction, Connect and Streams, and the same clients on any cloud.",
        tradeoff:
          "More to tune than Kinesis (partitions, retention, broker sizing), unless you use Serverless or Express brokers.",
      },
    ],
  },
  compute: {
    title: "Compute picker",
    start: "shape",
    questions: [
      {
        id: "shape",
        prompt: "What are you running?",
        options: [
          {
            label: "Short, event-driven tasks",
            hint: "uploads, queue messages, webhooks, cron; each run under 15 min",
            next: "fn-load",
          },
          { label: "A long-running service", hint: "APIs, web apps, WebSocket servers, consumers", next: "service" },
          { label: "Batch or scheduled jobs", hint: "ETL, rendering, simulations, training", next: "r-batch" },
          {
            label: "Something that needs the whole machine",
            hint: "GPUs, licensed software, custom kernel, legacy app",
            next: "r-ec2",
          },
        ],
      },
      {
        id: "fn-load",
        prompt: "How steady is the traffic?",
        options: [
          { label: "Spiky, or idle much of the day", hint: "bursts, nightly jobs, low volume", next: "r-lambda" },
          { label: "Steady and high", hint: "busy all day, millions of calls an hour", next: "r-lambda-steady" },
        ],
      },
      {
        id: "service",
        prompt: "How much platform do you want?",
        options: [
          { label: "Just ship a web app or API", hint: "one image, a URL, autoscaling", next: "r-express" },
          { label: "Containers, no Kubernetes", hint: "several services, AWS-native", next: "ecs-capacity" },
          { label: "Kubernetes", hint: "existing k8s skills, Helm, operators, multi-cloud", next: "k8s-nodes" },
        ],
      },
      {
        id: "ecs-capacity",
        prompt: "Who should run the servers?",
        options: [
          { label: "Nobody: pay per task", hint: "uneven load, small team", next: "r-fargate" },
          { label: "We pick instance types", hint: "GPUs, big memory, lowest cost at steady load", next: "r-ecs-ec2" },
        ],
      },
      {
        id: "k8s-nodes",
        prompt: "Who should manage the nodes?",
        options: [
          { label: "AWS", hint: "provisioning, patching, right-sizing", next: "r-eks-auto" },
          { label: "We do", hint: "custom AMIs, DaemonSets, tight cost control", next: "r-eks-nodes" },
        ],
      },
    ],
    results: [
      {
        id: "r-lambda",
        headline: "AWS Lambda",
        answer: { aws: ["aws-lambda"], gcp: ["gcp-cloud-run-functions"], azure: ["azure-functions"] },
        why: "You pay per request and per millisecond, it scales from zero to thousands of copies on its own, and there is nothing to patch.",
        tradeoff:
          "15-minute limit per run, cold starts on new environments, and a shared concurrency quota (1,000 per Region by default) that a burst can exhaust.",
      },
      {
        id: "r-lambda-steady",
        headline: "Lambda Managed Instances, or move to containers",
        answer: {
          aws: ["Lambda Managed Instances", "aws-fargate"],
          gcp: ["gcp-cloud-run"],
          azure: ["azure-functions", "azure-container-apps"],
        },
        why: "At steady volume, per-millisecond pricing costs more than paying for capacity. Managed Instances run your functions on EC2 that Savings Plans can discount; containers on Fargate are the other common move.",
        tradeoff: "You give up scale-to-zero and pay for capacity that is sometimes idle.",
      },
      {
        id: "r-batch",
        headline: "AWS Batch on Spot",
        answer: { aws: ["aws-batch"], gcp: ["gcp-batch"], azure: ["azure-batch"] },
        why: "Batch queues jobs, starts EC2, Spot or Fargate capacity for them and scales back to zero. Spot cuts the bill sharply for jobs that can retry.",
        tradeoff:
          "Spot capacity can be reclaimed with 2 minutes' notice, so jobs must checkpoint and be safe to rerun.",
      },
      {
        id: "r-ec2",
        headline: "EC2 in an Auto Scaling group",
        answer: { aws: ["aws-ec2"], gcp: ["gcp-compute-engine"], azure: ["azure-vm"] },
        why: "Full control of the instance type, OS and drivers; the Auto Scaling group spreads instances across zones and replaces unhealthy ones.",
        tradeoff: "OS patching, images, scaling rules and capacity planning are all yours.",
      },
      {
        id: "r-express",
        headline: "ECS Express Mode",
        answer: { aws: ["ECS Express Mode"], gcp: ["gcp-cloud-run"], azure: ["azure-container-apps"] },
        why: "One container image becomes a service with a load balancer, HTTPS URL and autoscaling on Fargate, and you can grow into the full ECS service later.",
        tradeoff:
          "Opinionated defaults. App Runner, which used to fill this role, is closed to new customers since April 30, 2026.",
      },
      {
        id: "r-fargate",
        headline: "ECS on Fargate",
        answer: { aws: ["aws-ecs", "aws-fargate"], gcp: ["gcp-cloud-run"], azure: ["azure-container-apps"] },
        why: "Each task gets its own right-sized micro-VM; there are no hosts, AMIs or cluster capacity to manage, and ECS has no control-plane fee.",
        tradeoff:
          "Costs more per vCPU-hour than EC2 at steady high load, no GPUs, and tasks top out at 16 vCPU / 120 GB.",
      },
      {
        id: "r-ecs-ec2",
        headline: "ECS on EC2 or ECS Managed Instances",
        answer: {
          aws: ["aws-ecs", "aws-ec2"],
          gcp: ["gcp-gke", "gcp-compute-engine"],
          azure: ["azure-aks", "Container Apps dedicated profiles"],
        },
        why: "You choose instance types (GPU, memory-heavy, Graviton), pack many tasks per host, and use Spot and Savings Plans. Managed Instances let AWS patch and replace those hosts.",
        tradeoff:
          "Capacity providers and host sizing are yours; Managed Instances remove the host work but add a management fee.",
      },
      {
        id: "r-eks-auto",
        headline: "EKS Auto Mode",
        answer: { aws: ["EKS Auto Mode"], gcp: ["gcp-gke"], azure: ["AKS Automatic"] },
        why: "Standard Kubernetes APIs while AWS provisions, patches and right-sizes nodes with Karpenter-based autoscaling.",
        tradeoff: "The cluster fee plus a fee on managed instances, and less control over node configuration.",
      },
      {
        id: "r-eks-nodes",
        headline: "EKS with managed node groups and Karpenter",
        answer: { aws: ["aws-eks", "aws-ec2"], gcp: ["gcp-gke"], azure: ["azure-aks"] },
        why: "Full control of nodes: custom AMIs, DaemonSets, GPU drivers, instance mix and Spot strategy.",
        tradeoff:
          "You own node and add-on upgrades and a Kubernetes version upgrade every year or so; staying on an old version costs $0.60 instead of $0.10 per cluster-hour.",
      },
    ],
  },
  ...TREES,
};
