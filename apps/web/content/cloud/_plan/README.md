# Cloud section: complete beginner-to-architect curriculum

Repo `/Users/dhanraj/Workspace/AI-ML`, app `apps/web`, section `/cloud`. Branch from `development`; PRs into `development`.

## 1. Context

The Cloud section today is a **service catalog**: 42 provider pages (AWS/GCP/Azure × 14 groups), 5 Start-here pages, 155 service profiles and 105 cross-cloud capabilities. It answers "which service?" well, but it does not **teach** cloud architecture. A beginner cannot start at `/cloud` and come out able to design a system, because:

- Nothing explains the ideas from first principles. The AWS pages assume you know what a VPC or a role is; the GCP and Azure pages assume you know AWS.
- 39 of 50 pages have no diagram at all, and none uses our animated diagram system. There are 11 small Mermaid charts in total.
- Whole exam-level themes are absent: disaster recovery and RPO/RTO, account structure and landing zones, identity across clouds, zero trust, cost management and FinOps, infrastructure as code, Kubernetes concepts, API protocols and gateways, migration, Well-Architected thinking.
- The 61 interview questions have one-paragraph answers with no diagram, list or "why".

The goal of this plan is a Cloud section that is **best in class for beginners**: every concept has its own page, one idea per diagram, one picture that works for AWS, Google Cloud and Azure through the Services toggle, interview questions whose answers explain and show, and content that is entirely our own. The exam blueprints for all three providers (Appendix A) are used only as a completeness check, so a learner who finishes the section has met everything the foundational, associate and professional architect exams expect, without us writing a single exam question.

## 2. Decisions already made (by the user)

| Decision | Choice |
|---|---|
| Where concept content lives | **New cloud-neutral concept hubs** beside Start here / AWS / GCP / Azure |
| API protocols (REST, GraphQL, gRPC, WebSockets, SSE, polling, webhooks) | **Written under `/cloud`**; the empty `/system-design/fundamentals` outlines will link to them |
| Scope now | **Cloud section only.** No case-study or system-design page writing in this plan. Components stay modular so case studies can reuse them later. |
| Exam-map pages | **None.** Exams are a coverage check only. |
| Diagrams | Our own drawn glyphs and specs; no vendor icon art, no vendor diagrams |
| Rollout rule | Pilot one page of each new format to approval, then roll out; execution with **parallel agents** |

## 3. What exists and is reused (no re-invention)

| Piece | Where | Reused for |
|---|---|---|
| Section registry, hub grids, sidebar nav | `content/sections.yaml`, `content/cloud/_index.yaml`, hub MDX `<ModelCategory>/<ModelCard>` | New hubs and pages need only content files; no code |
| Service catalog | `src/lib/cloud-catalog.ts`, `src/lib/cloud-data/<group>.ts` | `cloud:` names on diagram nodes, `<CloudServiceProfile>`, `<CloudGroupTable>` |
| Animated diagram system | `src/components/diagrams/{types.ts,animated-diagram.tsx,diagram.tsx,glyphs.tsx}`, specs in `assets/diagrams/animated/<topic>/<slug>.ts` + `.meta.yaml` | Every concept diagram; Services toggle via `node.cloud`; Region/VPC/subnet boundaries via `zone.kind` |
| Mermaid at build time | ```mermaid fences, `scripts/render-mermaid.mjs`, reusable `.mmd` in `assets/diagrams/mermaid/` | Small sequence and flow charts |
| Widgets | `src/components/cloud/*` (GroupTable, ServiceProfile, DecisionTree, ResponsibilityGrid, EquivalenceMatrix, CloudMapping, CloudOnly); generic `Callout`, `StepCards`, `DataModelView`, `ScenarioCard/Grid`, `Figure` | Decision moments, "who runs what", decide-then-reveal exercises |
| Interview questions | `<InterviewQuestions>/<InterviewQuestion>` in MDX; harvested by `src/lib/question-bank.ts` `loadArticleQuestions`; rendered on `/interviews` by `renderAnswer` in `src/components/mdx/question-bank.tsx`; taxonomy `cloud-architecture` | Per-page questions; needs the diagram fix in §8 |
| Rules | `AGENTS.md`, `apps/web/content/AGENTS.md`, `apps/web/assets/AGENTS.md`, `content-check` | Every PR |

## 4. Information architecture

`/cloud` keeps Start here, AWS, Google Cloud and Azure and adds six concept hubs. Concept pages are cloud-neutral: one explanation, one diagram, and the Services toggle (plus a short "On AWS / Google Cloud / Azure" block) shows the provider names. Provider pages keep their catalog role and gain a short "Concept" link-back and one diagram each.

Hub order on `/cloud` (`order` in hub frontmatter):

1. **Start here** (existing, trimmed to orientation + decision guides)
2. **Fundamentals** (`fundamentals`): what cloud is, regions and zones, accounts and governance, identity, shared responsibility, pricing basics, Well-Architected thinking, infrastructure as code
3. **Networking & APIs** (`networking`): VPC/VNet, subnets and routing, firewalls, private connectivity, DNS, load balancing, CDN and edge, hybrid links, API protocols, API gateways and webhooks
4. **Compute & Containers** (`compute`): VMs, autoscaling, containers, Kubernetes concepts, serverless, batch, choosing compute
5. **Data & Storage** (`data`): object/block/file, tiers and lifecycle, relational, NoSQL, caches, warehouses and lakes, streaming and messaging, data transfer and migration
6. **Reliability & Security** (`resilience`): HA vs DR, RPO/RTO, DR patterns, multi-AZ/multi-region, encryption and keys, secrets, zero trust, threat detection, compliance and residency
7. **Operations & Cost** (`operations`): observability, SLIs/SLOs, CI/CD and deployment strategies, patching and config, cost models, cost tools and FinOps, migration (7 Rs), AI/ML platforms on the cloud
8. **AWS**, 9. **Google Cloud**, 10. **Azure** (existing)

The exact page list per hub is the catalogue in §5. Design patterns (load balancing, caching, sharding, queues, CQRS…) are **not** duplicated: each concept page links to its `/system-design/patterns/*` page and the Cloud page explains only how the pattern is realised with managed services.

What changes on existing pages:
- `start-here/cloud-basics` splits into Fundamentals pages; `start-here` keeps a 10-minute orientation, the three decision guides and the service-equivalents matrix.
- The 14 AWS group pages gain one concept diagram each (reusing the Fundamentals/Networking/Data specs with the toggle set to AWS) and a "Learn the idea" link.
- The 28 GCP/Azure group pages are rewritten to stand alone (no "Coming from AWS" dependency), with a diagram and 2–3 questions each.

## 5. Page catalogue

**Full per-page specs (the briefs agents execute from)** live in `/Users/dhanraj/Workspace/SYSTEM-DESIGN/plans/cloud-curriculum/`, one file per hub: `00-start-here.md`, `01-fundamentals.md`, `02-networking.md`, `03-compute.md`, `04-data.md`, `05-resilience.md`, `06-operations.md`, `07-providers.md`. Each page entry there has: scope, H2 skeleton, every diagram with its asset id and step-by-step content, reused components, new needs, question count and three example questions, exam objectives, links. Wave 0 copies them into the repo as `apps/web/content/cloud/_plan/` (excluded from routing) so every page agent reads its own entry.

### Summary of every concept page (69 pages, 65 new)

| Hub | # | Page (slug) | Title | Lvl | Words | Diagrams | Qs (J/M/S) | Exams |
|---|---|---|---|---|---|---|---|---|
| start-here | 1 | `cloud-in-10-minutes` | Cloud in 10 Minutes | B | 1400 | 3 | 4 (1 J / 2 M / 1 S) | CLF D1 cloud concepts & value, D3 core service categories; Digital Leader §1 cloud concepts (Ia |
| start-here | 2 | `learning-paths` | Learning Paths | B | 900 | 2 | 0 (navigation page; no `articles.yaml` row) | coverage-check page only; its Path C lists the hubs that cover CLF/Digital Leader/AZ-900 (found |
| start-here | 3 | `choosing-compute` | Choosing Compute | I | 1400 | 4 | 5 (1 J / 3 M / 1 S) | SAA 2.1 (serverless, containers, horizontal scaling), 3.2 (compute selection, Lambda sizing, in |
| start-here | 4 | `queues-vs-streams` | Queues vs Streams | I | 1300 | 3 | 5 (1 J / 3 M / 1 S) | SAA 2.1 (queues/pub-sub, event-driven, loose coupling); CLF D3 application integration; SAP (Ev |
| start-here | 5 | `databases-per-cloud` | Databases on Each Cloud | I | 1300 | 4 | 5 (1 J / 3 M / 1 S) | SAA 3.3 (database selection, relational vs non-relational vs in-memory vs serverless), 4.x (Dyn |
| start-here | 6 | `service-equivalents` | Service Equivalents | B | 800 | 2 | 3 (1 J / 2 M / 0 S) | CLF D3 service categories; Digital Leader §4 infrastructure & app modernization terms; AZ-900 a |
| fundamentals | 1 | `what-is-cloud` | What the Cloud Is | B | 1600 | 3 | 4 (1J/2M/1S) | CLF D1 (value of cloud, CapEx→OpEx), DL cloud concepts, AZ-900 cloud concepts (definition, depl |
| fundamentals | 2 | `service-models` | Service Models: How Much Do You Run? | B | 1700 | 3 | 4 (1J/2M/1S) | CLF D1/D3 (service models, compute categories), DL cloud concepts (IaaS/PaaS/SaaS), AZ-900 clou |
| fundamentals | 3 | `regions-zones-edge` | Regions, Zones and the Edge | B | 1900 | 3 | 5 (1J/3M/1S) | CLF D3 (global infrastructure), SAA 2.2 (Regions/AZs), DL cloud concepts (regions/zones/latency |
| fundamentals | 4 | `shared-responsibility` | Shared Responsibility | B | 1500 | 2 | 4 (1J/2M/1S) | CLF D2 (shared responsibility), DL trust & security, AZ-900 cloud concepts (shared responsibili |
| fundamentals | 5 | `identity-and-access` | Identity and Access | I | 2600 | 4 | 5 (1J/3M/1S) | SAA 1.1 (users/groups/roles/policies, STS, federation, MFA, least privilege, root), CLF D2 (IAM |
| fundamentals | 6 | `accounts-and-governance` | Accounts, Projects and Governance | I | 1900 | 3 | 4 (1J/2M/1S) | SAA 1.1 (Organizations, SCPs), SAP organisational complexity (multi-account governance), CLF D2 |
| fundamentals | 7 | `landing-zones` | Landing Zones: Setting Up an Estate | I | 2000 | 3 | 5 (1J/3M/1S) | SAA 1.1 (multi-account, Control Tower), SAP organisational complexity (centralised logging, mul |
| fundamentals | 8 | `pricing-basics` | How Cloud Pricing Works | B | 1700 | 3 | 4 (1J/2M/1S) | CLF D4 (pricing models, cost tools), SAA 4.x (Spot/Reserved/Savings Plans, data-transfer paths) |
| fundamentals | 9 | `well-architected-thinking` | Well-Architected Thinking | I | 1800 | 3 | 4 (1J/2M/1S) | CLF D1 (Well-Architected pillars), SAA all domains (framing), PCA 1.x (Well-Architected Framewo |
| fundamentals | 10 | `infrastructure-as-code` | Infrastructure as Code | I | 2000 | 3 | 5 (1J/3M/1S) | CLF D1/D3 (IaC concept), SAP continuous improvement (CI/CD, Config/drift), ACE 3.x (Terraform,  |
| networking | 1 | `vpc-and-subnets` | Private Networks, Subnets & Routing | B | 2200 | 3 | 6 (1J/3M/2S) | CLF D3; SAA 1.2, 3.4; ACE 3 (custom/shared VPC), ACE 4 (subnet expansion); PCA 1 (cloud-native  |
| networking | 2 | `firewalls` | Firewalls: Security Groups, NACLs, NSGs & Firewall Policies | B | 1800 | 3 | 5 (1J/3M/1S) | SAA 1.2; CLF D2; ACE 3 (firewall rules by tags/service accounts); PCA 3 (hierarchical firewalls |
| networking | 3 | `nat-and-egress` | NAT & Leaving the Network | B | 1500 | 2 | 4 (1J/2M/1S) | SAA 1.2, 4.x (NAT costs, data-transfer paths); ACE 4 (Cloud NAT); AZ-104 networking. |
| networking | 4 | `private-endpoints` | Private Endpoints: PrivateLink, Private Service Connect & Private Link | I | 1800 | 2 | 5 (1J/3M/1S) | SAA 1.2, 3.4, 4.x; PCA 1 (Private Service Connect); AZ-900/AZ-104 (service vs private endpoints |
| networking | 5 | `connecting-networks` | Peering, Hub-and-Spoke & Transit | I | 1900 | 2 | 5 (1J/2M/2S) | SAA 3.4, 4.x (TGW vs peering); SAP organizational complexity (transitive routing, multi-VPC); A |
| networking | 6 | `hybrid-connectivity` | VPN, Direct Connect, Interconnect & ExpressRoute | I | 1700 | 2 | 4 (1J/2M/1S) | SAA 1.2, 3.4, 4.x (DX vs VPN cost); SAP (hybrid DNS); ACE 3 (Cloud VPN); PCA 2 (hybrid/multiclo |
| networking | 7 | `dns` | DNS on the Cloud: Public Zones, Private Zones & Routing Policies | B | 1600 | 2 | 5 (1J/3M/1S) | CLF D3; SAA 2.2, 3.4; SAP (DNS routing policies, Route 53 Resolver); Digital Leader network ter |
| networking | 8 | `load-balancing` | Load Balancing: L4 vs L7, Regional vs Global | B | 2000 | 3 | 6 (1J/3M/2S) | CLF D3; SAA 2.1, 3.4; ACE 2 (load balancing, Network Service Tiers); PCA 1; AZ-900, AZ-104 (int |
| networking | 9 | `cdn-edge-and-waf` | CDN, Edge, DDoS & WAF | I | 1800 | 2 | 5 (1J/2M/2S) | CLF D2-D3; SAA 1.2, 2.1, 3.4; Digital Leader (Cloud Armor/DDoS); PCA 1; AZ-900 (Front Door, DDo |
| networking | 10 | `hosting-apis` | Hosting REST and GraphQL APIs | B | 2000 | 3 | 6 (1J/3M/2S) | SAA 2.1 (API Gateway/REST); Digital Leader (APIs, Apigee); PCA 5 (API management); AZ-305 API i |
| networking | 11 | `service-to-service` | Service-to-Service Calls on the Cloud | I | 1600 | 2 | 5 (1J/3M/1S) | SAA 2.1 (microservices, ALB gRPC); PCA 1 (integration patterns); AZ-305. |
| networking | 12 | `realtime-on-the-cloud` | Real-Time Connections on the Cloud | I | 2100 | 3 | 6 (1J/3M/2S) | SAA 2.1 (API Gateway WebSocket, loosely coupled); AZ-305 messaging/event-driven. |
| networking | 13 | `webhooks-on-the-cloud` | Receiving and Sending Webhooks on the Cloud | I | 1600 | 2 | 5 (1J/3M/1S) | SAA 2.1 (event-driven, queues, EventBridge); SAP (EventBridge); AZ-305 event-driven/API integra |
| networking | 14 | `api-gateways` | API Gateways & API Management | I | 2000 | 3 | 6 (1J/3M/2S) | SAA 2.1 (API Gateway); Digital Leader (Apigee); PCA 5 (Apigee API management); AZ-305 API integ |
| compute | 1 | `compute-spectrum` | The Compute Spectrum: VMs to Functions | B | 1400 | 3 | 4 (1J/2M/1S) | CLF D1 (service models), CLF D3 compute categories; DL infra & app modernization (VMs vs contai |
| compute | 2 | `virtual-machines` | Virtual Machines, Instance Families and Images | B | 1900 | 3 | 5 (1J/3M/1S) | SAA 3.2 (instance types), SAA 2.2 (immutable infra), CLF D3; ACE 3 (instance templates, MIGs, O |
| compute | 3 | `autoscaling` | Autoscaling: The Control Loop | I | 1800 | 3 | 5 (1J/2M/2S) | SAA 2.1 (horizontal vs vertical scaling), SAA 3.2 (Auto Scaling), SAP continuous improvement (r |
| compute | 4 | `containers-and-registries` | Containers and Registries | B | 1600 | 2 | 5 (2J/2M/1S) | CLF D3 (containers); SAA 2.1 (containers, ECR implied); ACE 3 (deploying containers), PCA 3 (so |
| compute | 5 | `kubernetes-concepts` | Kubernetes Concepts: Cluster Anatomy and the Request Path | I | 2300 | 4 | 6 (1J/3M/2S) | SAA 2.1 (ECS/EKS containers), SAP (CI/CD on EKS implied); ACE 3 (GKE Autopilot, regional, priva |
| compute | 6 | `serverless-functions` | Serverless Functions: Triggers, Cold Starts and Concurrency | I | 2100 | 3 | 6 (1J/3M/2S) | SAA 2.1 (serverless, event-driven), SAA 3.2 (Lambda sizing); CLF D3; SAP (EventBridge, Lambda d |
| compute | 7 | `serverless-containers-and-paas` | Serverless Containers and Platforms as a Service | I | 1700 | 3 | 5 (1J/3M/1S) | SAA 2.1 (Fargate, ALB), SAA 3.2 (Fargate); CLF D3; ACE 3 (Cloud Run deploy), ACE 4 (Cloud Run t |
| compute | 8 | `batch-hpc-gpus` | Batch, HPC and GPUs | A | 1600 | 3 | 4 (1J/2M/1S) | SAA 3.2 (Batch, EMR, Spot), SAA 4.x (Spot/Reserved, instance families), SAP (placement groups); |
| data | 1 | `data-on-the-cloud` | Where Data Lives on the Cloud | B | 1300 | 1 | 4 (1J/2M/1S) | CLF D3 (core storage/database categories), SAA 2.1 storage types, DL data (databases vs warehou |
| data | 2 | `storage-types` | Object, Block and File: Which One for Which Job | B | 1500 | 1 | 5 (1J/3M/1S) | SAA 3.1 (object vs file vs block), CLF D3, DL data, AZ-900 storage services, ACE 2 (PD zonal vs |
| data | 3 | `object-storage` | Object Storage: Tiers, Lifecycle, Versioning and Redundancy | B | 2000 | 1 | 6 (1J/3M/2S) | SAA 3.1, SAA 1.3 (retention, lifecycle), SAA 4.x (S3 tiers/lifecycle/Requester Pays), CLF D3, D |
| data | 4 | `block-storage` | Block Storage: Volume Types, IOPS and Snapshots | B | 1400 | 1 | 4 (1J/2M/1S) | SAA 3.1, SAA 4.x (EBS volume types), SAA 3.3 (IOPS capacity planning), ACE 2 (PD zonal vs regio |
| data | 5 | `file-hybrid-and-transfer` | File Shares, Hybrid Storage and Moving Bulk Data | I | 1700 | 1 | 5 (1J/3M/1S) | SAA 3.1 (hybrid storage), SAA 3.5 (DataSync/Storage Gateway), SAP migration (Snow Family), CLF  |
| data | 6 | `managed-relational` | Managed Relational Databases: Replicas, Standbys, Proxies and Serverless SQL | I | 2200 | 1 | 6 (1J/3M/2S) | SAA 3.3 (read vs write heavy, proxies, replicas, engine choice), SAA 2.2 (RDS Proxy, Multi-AZ), |
| data | 7 | `managed-nosql` | Managed NoSQL: Partition Keys, Capacity Units and Global Tables | I | 2100 | 1 | 6 (1J/3M/2S) | SAA 3.3 (RCU/WCU capacity planning, relational vs non-relational), SAA 4.x (DynamoDB vs RDS), C |
| data | 8 | `managed-caches` | Managed Caches: Redis, Valkey, Memcached and the Patterns Around Them | I | 1600 | 1 | 5 (1J/3M/1S) | SAA 3.3 (ElastiCache, in-memory vs relational), SAA 2.1 (caching), CLF D3, AZ-305 infrastructur |
| data | 9 | `warehouses-lakes-and-query-engines` | Warehouses, Lakes and Query Engines | I | 1900 | 1 | 5 (1J/3M/1S) | SAA 3.5 (Athena, Glue, Lake Formation, data lakes, csv→parquet), SAA 4.x (columnar DBs), CLF D3 |
| data | 10 | `streaming-and-messaging-services` | Queues, Topics, Streams, Event Buses and Workflows on the Cloud | I | 2000 | 1 | 6 (1J/3M/2S) | SAA 2.1 (queues/pub-sub, event-driven, Step Functions), SAA 3.5 (Kinesis), SAP (EventBridge), C |
| data | 11 | `database-migration` | Database Migration: Full Load, Change Data Capture and Cutover | A | 1800 | 1 | 5 (0J/3M/2S) | SAA 4.x (DMS/SCT), SAP migration & modernization (DMS/SCT, 7 Rs), CLF D1 (migration strategies) |
| resilience | 1 | `availability-math` | Availability, SLAs and What Fails Together | B | 1600 | 1 | 5 (1J/3M/1S) | CLF D1 (global infrastructure, value of HA), SAA 2.2, SAP (SLAs/KPIs), DL operations (HA/DR ter |
| resilience | 2 | `ha-patterns` | High Availability Inside One Region | B | 2000 | 1 | 6 (1J/3M/2S) | SAA 2.1 (stateless vs stateful, ALB), SAA 2.2 (failover, RDS Proxy), SAP (immutable infra), ACE |
| resilience | 3 | `dr-strategies` | Disaster Recovery: Four Tiers, RPO and RTO | I | 2400 | 1 | 6 (1J/3M/2S) | SAA 2.2 (DR strategies, RPO/RTO), SAP (Elastic Disaster Recovery, business continuity), CLF D1, |
| resilience | 4 | `backups-and-vaults` | Backups, Snapshots, Vaults and Immutability | B | 1700 | 1 | 5 (1J/3M/1S) | SAA 1.3 (backups, retention, lifecycle), SAA 2.2 (durability), ACE 4 (snapshots, backups), PCA  |
| resilience | 5 | `multi-region` | Multi-Region, Global Routing and Data Replication | A | 2200 | 1 | 6 (1J/3M/2S) | SAA 2.2 (Route 53, active-active), SAA 3.4 (Global Accelerator, CloudFront), SAP (DNS routing p |
| resilience | 6 | `quotas-and-retries` | Quotas, Throttling, Retries and Backoff on the Cloud | I | 1600 | 1 | 5 (1J/3M/1S) | SAA 2.2 (service quotas), SAA 3.3 (capacity units), ACE 1 (quotas), DL operations (quotas), AZ- |
| resilience | 7 | `encryption-and-keys` | Encryption at Rest, in Transit and Key Management | I | 2300 | 1 | 6 (1J/3M/2S) | SAA 1.3 (encryption at rest/in transit, KMS, ACM, key policies, rotation), CLF D2, DL trust & s |
| resilience | 8 | `secrets-management` | Secrets, Identity-Based Access and Rotation | B | 1500 | 1 | 5 (1J/3M/1S) | SAA 1.2 (Secrets Manager), SAA 1.3 (rotation), CLF D2, ACE 5 (service accounts, short-lived cre |
| resilience | 9 | `zero-trust` | Zero Trust, Defence in Depth and Identity-Aware Access | I | 2000 | 1 | 6 (1J/3M/2S) | SAA 1.1 (MFA, least privilege), SAA 1.2 (segmentation), CLF D2, PCA 3 (context-aware access, IA |
| resilience | 10 | `threat-detection` | Threat Detection, Audit Logs and Security Posture | I | 1800 | 1 | 5 (1J/3M/1S) | SAA 1.2 (GuardDuty, Macie), SAP (centralised logging, Security Hub, Inspector, Access Analyzer, |
| resilience | 11 | `compliance-and-residency` | Compliance, Data Residency and Sovereignty | I | 1700 | 1 | 5 (1J/3M/1S) | SAA 1.3 (compliance alignment, classification), CLF D2 (compliance, governance), DL trust & sec |
| resilience | 12 | `ai-security` | AI Security on the Cloud: Guardrails, Filtering and Human Approval | I | 1800 | 1 | 5 (1J/3M/1S) | SAP (generative-AI guardrails, human-approval workflows, AgentCore Identity), PCA 2 and 3 (Agen |
| operations | 1 | `observability-on-the-cloud` | Observability on the Cloud | B | 2400 | 4 | 5 (1J/3M/1S) | CLF D3 (monitoring services), SAA 2.2 (X-Ray), SAP D3, ACE 4 (Cloud Monitoring/Logging, Ops Age |
| operations | 2 | `slos-alerting-and-on-call` | SLIs, SLOs, Alerting and On-Call | I | 2300 | 4 | 5 (1J/3M/1S) | SAP D3 (SLAs/KPIs), PCA 1 (KPIs) and 6 (alerting, chaos engineering, load testing), ACE 4, AZ-1 |
| operations | 3 | `ci-cd-and-deployment-strategies` | CI/CD and Deployment Strategies | I | 2800 | 4 | 6 (1J/3M/2S) | SAP D3 (blue/green, rolling, all-at-once, rollback, CI/CD), SAA 2.2 (immutable infra), ACE 3 (C |
| operations | 4 | `config-patching-and-fleet-management` | Configuration, Patching and Fleet Management | I | 2100 | 4 | 5 (1J/3M/1S) | SAP D3 (Systems Manager, patching, Config rules), SAA 2.2 (immutable infra), ACE 3-4 (instance  |
| operations | 5 | `cloud-cost-models` | Cost Models and Purchasing Options | B | 2500 | 4 | 5 (1J/3M/1S) | CLF D4 (pricing models, cost tools), SAA 4.x (Spot/Reserved/Savings Plans, NAT costs, transfer  |
| operations | 6 | `finops-and-cost-tools` | FinOps and the Cost Tools | I | 2000 | 4 | 5 (1J/3M/1S) | CLF D4 (budgets, cost tools, support), SAA 4.x (cost allocation tags, Cost Explorer/Budgets/CUR |
| operations | 7 | `migration-and-modernization` | Migration and Modernization | I | 2600 | 4 | 6 (1J/3M/2S) | CLF D1 (migration strategies, cloud economics), SAP D4 (7 Rs, Migration Hub, Application Discov |
| operations | 8 | `ai-ml-platforms-on-the-cloud` | AI/ML Platforms on the Cloud | I | 2400 | 4 | 5 (1J/3M/1S) | CLF D3 (AI/ML service categories), SAP D2 emerging (Bedrock Guardrails, AgentCore Identity, hum |

`compute/choosing-compute` is **merged into `start-here/choosing-compute`** (one page, the existing URL). `start-here/cloud-basics` is **kept untouched until** `fundamentals/what-is-cloud`, `regions-zones-edge`, `shared-responsibility` and `service-models` are written; it is removed and redirected in that wave, and its content is split across Fundamentals (RECONCILIATION §3).

**Wave 0 status (2026-11-11):** the table above shows the slugs and titles as scaffolded (the four API pages in Networking were renamed by RECONCILIATION §3). All 68 new pages exist as `status: outline` stubs: 63 in the six new hubs and 5 in Start here (`cloud-in-10-minutes`, `learning-paths` and three practice pages).

### Additions from the review (apply to the hub files in Wave 0)

**Applied in Wave 0:** each row below is now a "Review addition" bullet on its page entry in the hub briefs, except three that RECONCILIATION changed: `networking/how-a-request-travels` is dropped (link to `/system-design/fundamentals/anatomy-of-a-request`), the "Terms you need" H2 is replaced by `<Term id>` on first use, and there is no cloud glossary file or page (cloud terms were added to `content/system-design/glossary.yaml`).

| Add | Where | Why |
|---|---|---|
| New page `networking/how-a-request-travels` (Beginner, ~1,400 words, first page of the hub): IP, port, DNS, TLS, load balancer, latency, stateless, in that order; 6-step stepper `animated/cloud/request-path` (browser → DNS → edge → LB → app → database, then the same request failing at each hop) | Networking hub, order 1 | Every later page uses these words; define them once, before use |
| "Terms you need" H2 on every page, right after the opening problem | All pages (PAGE-FORMAT) | Explains before it is used, at page level |
| `<Term id>` glossary tooltip backed by `content/cloud/_glossary.yaml`, plus a generated `/cloud/start-here/glossary` page | Wave 1 component; Start here page 7 | One definition, used everywhere |
| `brightpost-grows` spine (Start here) is embedded by step in every hub's first page | All hubs | One running app the reader keeps meeting |
| Three practice pages in Start here, category "Design practice": `practice-web-app-from-zero`, `practice-survive-a-region-outage`, `practice-lock-down-a-leaky-account`; each reuses concept steppers by id, 6 Senior questions, no new diagrams | Start here, Wave 6 | Interview-shaped practice without touching case studies |
| Support plans and getting help (provider support tiers, health dashboards, status pages; no prices) | `fundamentals/pricing-basics` new H2 | CLF D4, DL 6.2 e–f |
| Hybrid and multicloud management (Azure Arc, GKE Enterprise, AWS Outposts / Google Distributed Cloud / Azure Local; VMware in the cloud) | `compute/kubernetes-concepts` H2 "One control plane, many places"; `operations/migration-and-modernization` H2 "Rehost VMware" | AZ-900 Arc, DL 4.6, ACE 3.2, SAA 4.2 Outposts, PCA 2.3 |
| Ways to talk to a cloud: console, CLI, Cloud Shell, SDKs, emulators (concepts, no click-paths) | `fundamentals/infrastructure-as-code` first H2 | AZ-900 tools, PCA 5.2 |
| Desktops as a service (Azure Virtual Desktop, WorkSpaces) | `compute/virtual-machines` short H3 | AZ-900 |
| AWS Transfer Family / SFTP endpoints | `data/file-hybrid-and-transfer` | SAA 2.1, 4.1; SAP 4.2 |
| Hibernation and warm pools | `compute/autoscaling` | SAA 4.2 |
| Penetration testing and attack simulation | `resilience/threat-detection` H2 "Test your own defences" | PCA 6.6 |
| Storage Lens and rightsizing reports | `operations/finops-and-cost-tools` | SAP 1.5 |
| BigQuery ML (SQL-first ML) | `operations/ai-ml-platforms-on-the-cloud` + `gcp/ai-ml` | DL 3.3a |
| Resource locks | `fundamentals/accounts-and-governance` | AZ-900, AZ-104 |
| Entra admin details (guests, self-service password reset, licences) | `azure/security` provider page | AZ-104 identities |

### Totals

| | Concept pages | Provider pages | Total |
|---|---|---|---|
| Pages | 69 + 1 request page + glossary + 3 practice = **74** (70 new, 4 rewritten) | 42 (14 upgraded, 28 rewritten) | **116** |
| Words | ≈ 133,000 | ≈ 24,500 | ≈ **157,000** |
| Diagram placements | ≈ 165 (animated, Mermaid, SVG, widgets) | 42 embeds + 42 ConceptMaps (no new drawings) | ≈ **250** |
| New diagram assets | ≈ 105 (≈ 90 animated specs, ≈ 15 Mermaid/SVG) | 0 | **≈ 105** |
| Interview questions | ≈ 365 new | 75 new + 54 rewritten | ≈ **440 new, 54 rewritten** |

## 6. Diagram program

### Naming and ownership

- Animated specs: `assets/diagrams/animated/cloud/<slug>.ts` + `<slug>.meta.yaml` (`source: original`, `alt` required, `tags: [cloud, <hub>, <topic>]`). The slug names the **concept**, never a provider.
- Reusable Mermaid: `assets/diagrams/mermaid/cloud/<slug>.mmd`. Static SVG: `assets/diagrams/svg/cloud/<slug>.svg`. One-off Mermaid stays inline.
- **Every asset has exactly one owner page** that creates it; every other page embeds it by id (`step={n}` or `stepper`). Wave 0 reserves all ids below so no two agents draw the same thing.

**The list of record is `ASSETS.md` in this folder** (id, owner page, kind, what it shows), written in Wave 0 with the RECONCILIATION changes: `request-path` dropped, `rest-vs-graphql` renamed `api-hosting-paths`, `brightpost-compute-journey` owned by `start-here/choosing-compute`, and the Mermaid and SVG assets below turned into `sequence` and `layout` specs. The table below is the original plan.

Canonical animated specs by owner hub (≈ 90):

| Owner hub | Asset ids (`animated/cloud/…`) |
|---|---|
| start-here | `brightpost-grows` (the spine, embedded by step in every hub), `queue-topic-stream`, `brightpost-data-tier` |
| fundamentals | `one-server-to-elastic`, `service-model-ladder`, `region-zone-edge`, `responsibility-line`, `iam-role-chain` (pilot), `resource-hierarchy`, `landing-zone`, `iac-pipeline` |
| networking | `request-path` (new), `vpc-three-tier` (flagship; reused by later case studies), `firewall-layers`, `nat-egress`, `private-endpoint`, `hub-spoke`, `hybrid-link`, `dns-resolution`, `lb-l4-vs-l7`, `cdn-request-path`, `rest-vs-graphql`, `grpc-call`, `realtime-transports`, `managed-websockets`, `webhook-receiver`, `api-gateway-request` |
| compute | `compute-spectrum`, `vm-anatomy`, `vm-fleet-three-zones`, `autoscaling-loop`, `container-vs-vm`, `container-image-to-run`, `k8s-cluster-anatomy`, `k8s-request-path`, `serverless-request`, `serverless-event-triggers`, `serverless-containers-scale`, `paas-stack`, `batch-job-queue`, `gpu-fleet`, `brightpost-compute-journey` |
| data | `data-map`, `storage-three-shapes`, `object-upload-lifecycle`, `redundancy-copies`, `block-snapshot-chain`, `hybrid-transfer-paths`, `managed-relational-ha`, `nosql-partitions`, `cache-patterns`, `lake-to-warehouse`, `event-pipeline`, `stream-partitions`, `migration-cutover` |
| resilience | `nines-ladder`, `failure-domains`, `multi-az-tier`, `dr-tiers` (flagship), `rpo-rto-timeline`, `backup-chain`, `global-routing`, `write-topologies`, `limit-layers`, `retry-storm`, `encryption-states` (flagship), `envelope-encryption`, `secret-fetch-rotate`, `defence-layers`, `zero-trust-request`, `detection-pipeline`, `residency-perimeter`, `ai-guardrail-path` |
| operations | `three-signals`, `telemetry-pipeline`, `alert-path`, `deployment-strategies`, `image-pipeline`, `cost-levers` (pricing-basics embeds a step), `cost-allocation`, `migration-waves`, `ai-adoption-ladder`, `ai-platform-building-blocks` |

Mermaid assets (`mermaid/cloud/…`): `section-map`, `learning-paths`, `pick-a-database`, `sts-assume-role`, `firewall-evaluation`, `dns-lookup`, `tls-at-lb`, `grpc-deadline`, `webhook-retry`, `gateway-vs-lb`, `storage-class-ladder`, `replica-lag-read-after-write`, `delivery-guarantees`, `db-failover-sequence`, `retry-backoff-jitter`, `ci-cd-pipeline`, `slo-ladder`, `data-transfer-paths`. SVG (`svg/cloud/…`): `error-budget-burn`, `finops-loop`, `seven-rs`.

Provider pages create **no** new diagrams. Each embeds one concept spec with the toggle preset to its provider (table in `07-providers.md`), e.g. `aws/networking` → `vpc-three-tier`, `gcp/databases` → `managed-relational-ha`, `azure/security` → `iam-role-chain`.

### Conventions (what "meaningful" means here)
1. **One idea per diagram.** If a diagram needs two titles, it is two diagrams.
2. **Every architecture diagram is a stepper**: step 1 is the simplest working thing; each step adds one component and the caption says why. Steps carry `covers:` so the text can reference them.
3. **One failure or alternative step** in every stepper (the zone fails, the key leaks, the region goes down), so the reader sees what the component protects against.
4. **Tones by layer**, from `CASE-STUDY-FORMAT.md`: Clients neutral, Edge blue, core request path green (one `accent`), app services teal, async orange, storage violet. Add: security/identity red glyphs; boundaries use `zone.kind` region/vpc/subnet.
5. **Services toggle on every architecture diagram**: each node has `cloud: { aws, gcp, azure }` with catalog ids, so the same picture teaches all three clouds and `<CloudMapping>` can print the mapping table under it.
6. **Labelled flows**: main request path uses `flow + packet` with increasing `delay`; control-plane or secondary calls are `dashed`; every edge that matters has a short verb label.
7. **Glyphs, not logos**: drawn glyphs from `glyphs.tsx`; add missing glyphs (key, shield, lock, firewall, router, vpn, dns, bucket-tier, metric, pipeline, robot) in one PR.
8. **Alt text explains the picture in one sentence**; captions say what to notice.
9. Diagrams are reusable by id from any page, so a provider page or later a case study embeds the same spec with `step={n}` or `stepper` instead of redrawing.

## 7. Modular components and code changes

Prefer data over code. All code lands in **Wave 1** (two parallel PRs) before any page is written; page agents never add code.

**PR 1a – rendering (`src/components/…`, `src/lib/mdx-doc.tsx`, `src/lib/mdx-lazy-widgets.tsx`)**

| Change | Files | Used by |
|---|---|---|
| ≈ 24 new drawn glyphs: `firewall, router, nat, tunnel, building, webhook, image, container, pod, node, function, controller, folder-share, appliance, proxy, partition, topic, snapshot, vault, certificate, radar, signal, trace, flag, meter, coin, model, policy, pipeline` (already exist and are reused: `api, browser, dns, key, lock, shield, log, disk, folder, gpu, cpu, robot, search, feed, tree, ledger, clock, timer, chart`) | `src/components/diagrams/glyphs.tsx` (`GLYPHS`, `GlyphName`) | Every hub |
| `cloud=` prop on `<AnimatedDiagram>` (initial Services toggle: `aws`/`gcp`/`azure`) | `src/components/diagrams/diagram.tsx`, `animated-diagram.tsx` | 42 provider pages embed concept specs |
| `<ConceptMap spec lead>`: the component → AWS / Google Cloud / Azure table for any spec (generalises `CloudMapping`; `CloudMapping` stays as a thin alias for case studies) | `src/components/cloud/concept-map.tsx` | Every architecture diagram, all provider pages |
| `<CloudTabs>` with `<CloudTab provider>` children: the "On AWS / Google Cloud / Azure" block; heading shows catalog names from `ids` prop | `src/components/cloud/cloud-tabs.tsx` (lazy) | Every concept page |
| `<Term id>` tooltip + glossary page data from `content/cloud/_glossary.yaml` (Zod-validated; content-check verifies every `<Term id>` exists) | `src/components/cloud/term.tsx`, `src/lib/cloud-glossary.ts`, `scripts/content-check.ts` | Every concept page |
| `InterviewQuestion diagram=` end to end (§8) | `src/components/mdx/interview-qa-island.tsx`, `interview-qa.tsx`, `src/lib/question-bank.ts`, `src/components/mdx/question-bank.tsx`, `scripts/content-check.ts` | Every question |
| "Learn the idea →" link in `<CloudServiceProfile>` when the service has `concept` | `src/components/cloud/cloud-service-profile.tsx` | 155 profiles |

**PR 1b – data (`src/lib/cloud-catalog.ts`, `src/lib/cloud-data/*`)**

| Change | Detail |
|---|---|
| `DECISION_TREES` (+15) | `database, storage, transfer, connectivity, load-balancer, api-protocol, identity-type, account-structure, iac-tool, cost-model, serverless-fit, scaling-signal, dr-strategy, backup-vs-replication, key-management, deploy-strategy, migration-r` (existing: `compute, messaging`) |
| `RESPONSIBILITY_SETS` (+11) | `shared-responsibility, gcp-compute, azure-compute, kubernetes, network-security, object-storage, databases, ha-controls, encryption-controls, patching` (existing: `aws-compute`); rename the export from `AWS_COMPUTE_OPTIONS` to a keyed map |
| `CloudService.concept?: string` | href of the concept page; filled for every service whose group has a concept page |
| `CloudService.capacityModel?` (databases) | "instances", "capacity units", "serverless", shown in the profile |
| Catalog entries (≈ 40) | migration/transfer (aws-datasync, aws-storage-gateway, aws-snow-family, aws-transfer-family, aws-dms, aws-sct, aws-migration-hub, gcp-storage-transfer, gcp-transfer-appliance, gcp-database-migration-service, gcp-migration-center, azure-data-box, azure-file-sync, azure-migrate, azure-dms), governance/cost (aws-organizations, aws-control-tower, aws-cost-explorer, aws-budgets, aws-compute-optimizer, gcp-resource-manager, gcp-cloud-billing, azure-management-groups, azure-policy, azure-cost-management, azure-advisor), security (aws-guardduty, aws-inspector, aws-macie, aws-security-hub, aws-backup, aws-elastic-disaster-recovery, aws-verified-access, gcp-iap, gcp-vpc-service-controls, gcp-sensitive-data-protection, gcp-model-armor, azure-defender-for-cloud, azure-site-recovery, azure-backup, azure-purview), lake/governance (aws-lake-formation, gcp-dataplex); each with `useWhen/avoidWhen/gotchas` in our words. Pages may use `{label}` until an id exists. |
| content-check | every `cloud:` id on a spec node exists in `SERVICE_BY_ID` |

**Reuse later by case studies (no case-study work now):** a case study embeds `<AnimatedDiagram spec="animated/cloud/vpc-three-tier" stepper />`, `dr-tiers`, `iam-role-chain`, `encryption-states` and `<ConceptMap>` exactly as concept pages do; `CASE-STUDY-FORMAT.md` gets a one-paragraph note pointing at these ids (only the doc fix, in Wave 0).

## 8. Interview question program

**Targets:** every concept page 4–6 questions (1 Junior, 2–3 Mid, 1–2 Senior); every provider page 3 (0–1 Junior, 2 Mid, 0–1 Senior). New total ≈ 440 new questions plus 54 rewritten (from 61 today).

**House style for an answer** (renders in the article and survives the library's plain-text harvest):
1. First line: the direct answer in one sentence (bold the decision).
2. `- ` bullets: the two or three reasons, each one line.
3. One bullet starting **Trade-off:** or **What breaks:**.
4. Optional **Follow-up:** the question an interviewer asks next.
5. A diagram, attached by id (below), never inline Mermaid (the library view would flatten it).

**Diagram fix (recommended):** add an optional `diagram="animated/cloud/<slug>"` (or `mermaid/cloud/<slug>`, or `#step=n`) attribute to `<InterviewQuestion>`.
- In the article, `interview-qa.tsx` renders the referenced asset under the answer (through the same asset components as `<Figure>`/`<AnimatedDiagram>`, single `step` when given).
- In `src/lib/question-bank.ts`, `QUESTION_RE` already captures the attribute string; parse `diagram` and keep it on the `LibraryQuestion` (`diagram?: { id, title, href }`).
- In `src/components/mdx/question-bank.tsx`, `renderAnswer` stays plain text; `questionItems` adds a line "Diagram: <title> →" linking to `${href}#${slug}` on the article. No Mermaid or components ever enter the harvested text, so nothing flattens.
- `content-check`: validate that `diagram` ids exist in the asset manifest.

**Bank file:** add `content/question-bank/cloud-architecture.yaml` for cross-cloud scenario questions that belong to no single page (e.g. "Design a 3-tier app that survives a zone failure on the cloud of your choice"), subsection `scenarios`. Taxonomy `cloud-architecture` subsections become `fundamentals, networking, compute, data, resilience, operations, aws, gcp, azure, scenarios`; `articles.yaml` maps every new page (content-check makes an unmapped Cloud page a build error).

## 9. Rules for writers (originality and beginner clarity)

**Originality**
- Write from the concept, not from a source. Start each page from the diagram spec and the three "why" bullets; never from a vendor page or course.
- Our own analogies and examples (the same running example across the section: a small online shop called *Brightpost* that grows from one VM to multi-region).
- Vendor docs appear only as `docs:` links in service profiles. No vendor diagrams, screenshots, console click-paths, or pricing figures that go stale (say "cheaper per GB than…" not "$0.023/GB").
- No exam questions, exam wording, or question-bank material from anywhere. Interview questions are written from our pages.
- Anything quoted needs a `NOTICE.md` licence entry, so the rule is simply: quote nothing.

**Beginner clarity (per-page checklist, enforced in review)**
1. Opening paragraph answers "what problem does this solve?" before naming anything.
2. Every term is defined the first time it appears, in plain words, and linked to its own page if it has one.
3. One analogy per page, used once.
4. One diagram per idea; a stepper for any architecture.
5. A **What breaks** box: the failure this component prevents.
6. A **Try it** moment: a `<CloudDecisionTree>`, `<ScenarioGrid>` or `<ResponsibilityGrid>`.
7. **On AWS / Google Cloud / Azure** tabs with the service names and the one difference that changes a design.
8. **Common mistakes** (3 bullets) and **Related** links.
9. Interview questions in the §8 style.
10. Reading level: Flesch-Kincaid grade ≤ 8 on Beginner pages and ≤ 10 elsewhere; sentences ≤ 20 words; active voice; no undefined acronym; no "simply" or "just"; headings are questions or plain nouns; every number gets a comparison ("about 53 minutes a year").
11. The page reads alone: no sentence depends on having read another page; a "Terms you need" H2 follows the opening problem.
12. Originality spot-check in review: the reviewer searches two sentences per page on the web; any close match is rewritten.

## 10. Exam coverage matrix

Checked by keyword and objective against the nine official guides in Appendix A. Every theme has a concept home; provider-specific objectives live on the provider pages.

| # | Theme | Concept pages (hub/slug) | Provider pages | Exams it satisfies |
|---|---|---|---|---|
| 1 | Cloud concepts & economics | start-here/cloud-in-10-minutes, fundamentals/what-is-cloud, service-models, pricing-basics | all hubs' TL;DR | CLF D1, D4; DL §1; AZ-900 cloud concepts |
| 2 | Global infrastructure | fundamentals/regions-zones-edge, resilience/availability-math | */edge | CLF D3; SAA 2.2; DL 1.2d; ACE 2.3; AZ-900 regions/AZs/pairs/sovereign |
| 3 | Accounts & governance | fundamentals/accounts-and-governance, landing-zones, well-architected-thinking | */security, */devops | SAA 1.1; SAP 1.4; ACE 1.1–1.2; PCA 3.1; AZ-900 governance; AZ-104 governance; AZ-305 governance |
| 4 | Identity | fundamentals/identity-and-access (pilot), shared-responsibility; resilience/secrets-management, zero-trust | */security | CLF D2; SAA 1.1; SAP 1.2; ACE 5.1–5.2; PCA 3.1; AZ-900 identity; AZ-104 Entra/RBAC; AZ-305 authN/authZ |
| 5 | Networking | networking/vpc-and-subnets … cdn-edge-and-waf (9 pages) | */networking, */edge | SAA 1.2, 3.4, 4.4; SAP 1.1; ACE 2.3, 3.5, 4.5; PCA 1.3, 2.1; AZ-900 networking; AZ-104 networking; AZ-305 network |
| 6 | Compute & scaling | compute/* (8), start-here/choosing-compute | */compute, */containers, */serverless | SAA 2.1, 3.2, 4.2; ACE 2.1, 3.1–3.3, 4.1–4.3; PCA 1.3, 2.3; AZ-104 compute; AZ-305 compute |
| 7 | Storage | data/data-on-the-cloud, storage-types, object-storage, block-storage, file-hybrid-and-transfer | */storage | SAA 3.1, 4.1; ACE 2.2, 4.4; DL 2.2d; AZ-900 storage; AZ-104 storage; AZ-305 unstructured |
| 8 | Databases | data/managed-relational, managed-nosql, managed-caches, warehouses-lakes-and-query-engines, database-migration; start-here/databases-per-cloud (theory links to /system-design/databases) | */databases, */caching, */analytics | SAA 3.3, 3.5, 4.3; SAP 4.3; ACE 3.4; DL 2.1–2.3; PCA 1.3; AZ-305 relational/semi-structured/integration |
| 9 | Messaging & events | data/streaming-and-messaging-services; start-here/queues-vs-streams | */messaging | SAA 2.1; SAP 2.4, 4.4; DL 2.3d; AZ-305 messaging/event-driven |
| 10 | Reliability & DR | resilience/availability-math, ha-patterns, dr-strategies, backups-and-vaults, multi-region, quotas-and-retries | */databases, */storage | SAA 2.2; SAP 1.3, 2.2, 2.4, 3.4; PCA 1.2; AZ-104 backup; AZ-305 business continuity |
| 11 | Security & compliance | resilience/encryption-and-keys, secrets-management, zero-trust, threat-detection, compliance-and-residency, ai-security; networking/cdn-edge-and-waf | */security | CLF D2; SAA 1.2–1.3; SAP 1.2, 2.3, 3.2; DL §5; PCA 3.1–3.2; AZ-900 security; AZ-305 secrets/compliance |
| 12 | Observability & operations | operations/observability-on-the-cloud, slos-alerting-and-on-call, ci-cd-and-deployment-strategies, config-patching-and-fleet-management; fundamentals/infrastructure-as-code | */observability, */devops | SAP 2.1, 3.1; ACE 3.6, 4.6; PCA 4.1, 5.1–5.2, 6.x; AZ-900 monitoring/IaC; AZ-104 monitor; AZ-305 logging |
| 13 | Cost | fundamentals/pricing-basics; operations/cloud-cost-models, finops-and-cost-tools | every provider page "pricing" line | CLF D4; SAA 4.1–4.4; SAP 1.5, 2.6, 3.5; ACE 1.2; DL 6.1; AZ-900 cost; AZ-104 budgets |
| 14 | Migration & modernization | operations/migration-and-modernization; data/database-migration, file-hybrid-and-transfer | */compute (rehost notes) | SAP 4.1–4.4; DL 4.1; PCA 1.4; AZ-305 migrations |
| 15 | AI/ML on the cloud | operations/ai-ml-platforms-on-the-cloud; resilience/ai-security; compute/batch-hpc-gpus | */ai-ml | CLF D3; SAP emerging (Guardrails, AgentCore, human approval); DL §3; PCA 1.3, 2.4–2.5, 3.1 |
| 16 | APIs | networking/hosting-apis, service-to-service, realtime-on-the-cloud, webhooks-on-the-cloud, api-gateways | */serverless | SAA 2.1; DL 4.5; PCA 5.1 (Apigee); AZ-305 API integration |

**Deliberately left out** (and why): console click-paths and screenshots (they change monthly and are not architecture); prices, limits and quotas as numbers (stale; we teach the shape of the cost instead); exam-style multiple-choice drills, exam wording or dumps (copyright and integrity; our questions are interview questions written from our pages); per-command CLI syntax beyond one-line illustrations (ACE/AZ-104 hands-on detail belongs to docs); vendor marketing themes with no design content (e.g. "transformation cloud" narratives in DL §1.1h) beyond one sentence; certification logistics.

## 11. Execution plan for parallel agents

The nav mirror rule (`_index.yaml` must equal each hub MDX grid) and `articles.yaml` make hub files and index files **shared**. So: scaffold once, then fan out on files that no two agents share.

**Wave 0 – Scaffold (one agent, one PR).** Create the six new hub MDX files and their `_index.yaml` entries; every new page as a `status: outline` stub with its final frontmatter (title, description ≤ 160, icon, order); the `cloud-basics` redirect; `articles.yaml` rows and the taxonomy subsections; an empty `cloud-architecture.yaml`; `content/cloud/_glossary.yaml` seeded with the terms the hub files list; asset folders with the reserved ids from §6 listed in `assets/diagrams/animated/cloud/README.md`; the eight hub briefs copied to `apps/web/content/cloud/_plan/` (with the §5 review additions applied); and the one-paragraph `CASE-STUDY-FORMAT.md` fix. `PAGE-FORMAT.md` is added after the pilot is approved. Exit: `content-check` 0 errors; build passes; `/cloud` shows the hubs with outline cards.

**Wave 1 – Platform (two agents, runs at the same time as Wave 0; two PRs).** PR 1a rendering and PR 1b data, exactly as listed in §7. They touch only `src/**`, `scripts/content-check.ts` and catalog files, never `content/**`, so they do not collide with the scaffold. Exit: typecheck, lint, unit tests (new tests for the `diagram=` harvest and the glossary schema), a hidden demo MDX page that exercises every new widget, removed before merge.

**Wave 2 – Pilot (one agent).** One Fundamentals page (`identity-and-access`, the hardest beginner topic) with its stepper spec, tabs, decision tree, 5 questions with diagrams. User approves; it becomes `PAGE-FORMAT.md`.

**Waves 3–6 – Content fan-out.** One agent per page; each touches only its own `content/cloud/<hub>/<slug>.mdx`, its own `assets/diagrams/animated/cloud/<slug>.*`, and its rows in `cloud-architecture.yaml` (if any). Hub MDX and `_index.yaml` already contain the card (status flips from `outline` to published in the page's own PR plus the one-line card status change — the only shared-file edit, kept to one line per PR to avoid conflicts). Suggested batches: Fundamentals (10), Networking & APIs (14), Compute + Data (18), Reliability/Security + Operations (16), provider page upgrades (42, mechanical, can run 10 at a time).

**Wave 7 – QA sweep.** Parallel reviewers per hub against the §9 checklist, link check, visual check at phone width and dark mode, `content-check`, `APP_ENV=production` build, E2E route crawl.

### Rules that keep parallel agents from colliding

1. **Shared files are written only in Wave 0** (`content/cloud/<hub>.mdx`, `content/cloud/_index.yaml`, `content/question-bank/articles.yaml`, `taxonomy.yaml`, `sections.yaml`). After that, a page agent may change exactly one line in `<hub>.mdx` and one in `_index.yaml`: its own card's `status: outline` removal. Nothing else.
2. **One page, one agent, one branch, one PR.** Branch `content/cloud-<hub>-<slug>` from `development`. The PR contains: the page MDX, its spec `.ts` + `.meta.yaml` (and `.mmd` if any), its `cloud-architecture.yaml` rows (if any), the two one-line status flips. Nothing else.
3. **Generated files are never committed by page agents** (`src/components/diagrams/animated-specs.ts`, `src/generated/*`). Run `npm run assets` locally to check, then discard.
4. **Code is only in Wave 1.** A page agent that needs a glyph, tree or widget that does not exist uses the nearest existing one and files a one-line note in its PR description; it does not add code.
5. **Asset ids are reserved in Wave 0** (the full list in §6), so two agents never create the same spec. An agent that needs an unlisted diagram names it `<slug>-<n>` under its own page slug.
6. **No agent edits another agent's page.** Cross-links point at slugs from the catalogue; a link to a page that is still an outline is fine (the card exists from Wave 0).
7. **Merge order inside a wave does not matter**; the only merge conflicts possible are the one-line status flips, which Git resolves cleanly when they are on different lines (keep cards one per line, as today).

### Brief template for a page agent

```
Page: content/cloud/<hub>/<slug>.mdx  (its entry in content/cloud/_plan/<nn>-<hub>.md, pasted here)
Format: copy content/cloud/PAGE-FORMAT.md (the approved pilot) section for section.
Diagram(s): create assets/diagrams/animated/cloud/<slug>.ts + .meta.yaml per the catalogue steps; tones/zones per §6; every node has cloud:{aws,gcp,azure} using catalog ids from src/lib/cloud-data/*.ts.
Questions: N (J/M/S) in the §8 style, each with diagram= where the catalogue says so.
Rules: §9 checklist; own words only; no vendor diagrams/prices/exam text; description <= 160 chars; icon from src/lib/icons.ts.
Shared files: flip only your own card's status in content/cloud/<hub>.mdx and content/cloud/_index.yaml.
Done when: npm run content-check -w web = 0 errors/0 warnings; npm run typecheck/lint/format:check pass; page renders at http://localhost:3001/cloud/<hub>/<slug> (Local view: Paid) with the Services toggle switching names; screenshot at 390px and 1280px attached to the PR.
```

### Wave sizes and parallelism

| Wave | Agents at once | PRs | Blocks on |
|---|---|---|---|
| 0 Scaffold | 1 | 1 | plan approval |
| 1 Platform | 2 | 2 | nothing (parallel with Wave 0) |
| 2 Pilot | 1 | 1 | Waves 0 and 1 merged; **user approves the page** |
| 3 Fundamentals (9 after the pilot) + Start here (4 rewrites, 2 new, glossary) | up to 16 | 16 | Wave 2 approved |
| 4 Networking & APIs (15) + Compute (8) | up to 23 | 23 | Wave 2 approved (runs with Wave 3) |
| 5 Data (11) + Reliability & Security (12) + Operations (8) | up to 31 | 31 | Wave 2 approved (runs with Wave 3) |
| 6 Provider pages (42, one agent per group across its 3 providers) + 3 practice pages | up to 17 | 17 | the concept specs they embed are merged |
| 7 QA sweep | 7 (one per hub) | fix PRs | Waves 3–6 merged |

Waves 3–5 are independent of each other and run together: about 70 page agents after the pilot, limited only by review capacity. Critical path: Wave 0 ∥ Wave 1 → pilot approval → Waves 3–5 together → Wave 6 → Wave 7. Reviews are the real bottleneck: budget one human review per page, using the §9 checklist as the rubric.

## 12. Verification

- `npm run content-check -w web` → 0 errors, 0 warnings.
- `npm run typecheck`, `lint`, `format:check`, `test` in `apps/web`.
- `npm run build` with `APP_ENV=production` (Cloud is `hidden`, so it must still build).
- Dev server at `http://localhost:3001`: every new URL 200 with the Local view set to Paid; sidebar and header show the new hubs; Services toggle switches names on every architecture diagram; `/interviews/cloud-architecture` lists the new questions with their diagram links.
- Visual check: 390 px and 1280 px, light and dark, for one page per hub.

## 13. Risks and open questions

| Risk | Mitigation / default |
|---|---|
| **Review becomes the bottleneck** with 100+ page PRs | Approve the pilot carefully, then review against the checklist only; batch provider-page PRs by group (one reviewer pass per group). |
| **Diagram quality drifts** across agents | The pilot spec is the template; §6 conventions are checked in review; the QA wave re-renders every spec at 390 px. |
| **Accidental copying** (an agent paraphrases a vendor page) | Brief forbids reading vendor tutorials while writing; writers start from the spec and the three "why" bullets; a QA agent runs a similarity check of each page against the official docs linked from its service profiles and flags passages over 12 matching words. |
| **Services toggle names wrong or missing** | Every node must use a catalog id; `content-check` already fails on unknown asset refs; add a check that every `cloud:` id exists in `SERVICE_BY_ID`. |
| **Premium gating hides the new pages from search and from beginners** | Hubs and outlines are free; decide before Wave 0 whether the Fundamentals hub's pages should be `access: free` as the funnel (default: Fundamentals free, everything else premium). |
| **Section grows past the header/sidebar design** (10 hubs) | The header already groups by Learn/Practice/More; the sidebar is per hub. The `/cloud` index gets 10 cards, which the existing `TopicCard` grid handles; check at 1024 px in the pilot. |
| **Stale provider facts** (service renames, new regions) | Catalog has `VERIFIED = "November 2026"`; pages state no prices or limits that change often; a quarterly catalog review is a separate task. |

Open questions (answer before Wave 0; defaults in bold):
1. Make the Fundamentals hub free as the funnel? **Yes.**
2. Keep `cloud-basics` as a redirect to `fundamentals/what-is-cloud`? **Yes, via the section `redirects` in `sections.yaml`.**
3. Running example name *Brightpost* acceptable, or use an existing site persona? **Brightpost.**

## Appendix A. Exam blueprints researched (official guides, fetched 2026-11-09)

Used only to find gaps in our coverage. We never copy exam text or questions; our pages explain the concepts in our own words with our own diagrams.

### AWS Certified Cloud Practitioner (CLF-C02) — beginner
Domains: Cloud Concepts 24%, Security and Compliance 30%, Cloud Technology and Services 34%, Billing/Pricing/Support 12%.
Concepts: value of cloud, shared responsibility, Well-Architected pillars, migration strategies, cloud economics (CapEx→OpEx, TCO), security governance, IAM basics, global infrastructure (Regions/AZs/edge), core compute/database/network/storage, AI/ML & analytics service categories, pricing models, budgets/cost tools, support plans.

### AWS Solutions Architect Associate (SAA-C03) — intermediate
Domains: Secure 30%, Resilient 26%, High-Performing 24%, Cost-Optimized 20%.
- 1.1 Secure access: multi-account (Organizations, Control Tower, SCPs), IAM users/groups/roles/policies, STS/role switching/cross-account, federation, resource policies, least privilege, MFA, root user.
- 1.2 Secure workloads: VPC security (security groups, NACLs, route tables, NAT), public/private subnet segmentation, service endpoints, WAF/Shield/Secrets Manager/Cognito/GuardDuty/Macie, VPN/Direct Connect, DDoS/SQLi threats.
- 1.3 Data security: encryption at rest (KMS) and in transit (ACM/TLS), key policies/rotation, backups/replication, retention/classification/lifecycle, compliance alignment.
- 2.1 Scalable, loosely coupled: API Gateway/REST, caching, microservices stateless vs stateful, event-driven, horizontal vs vertical scaling, CDN, containers (ECS/EKS), ALB, multi-tier, queues/pub-sub, serverless (Lambda/Fargate), storage types (object/file/block), read replicas, Step Functions.
- 2.2 HA / fault-tolerant: Regions/AZs/Route 53, DR strategies (backup-restore, pilot light, warm standby, active-active; RPO/RTO), failover, immutable infra, RDS Proxy, service quotas, durability, X-Ray.
- 3.1 Storage: S3/EFS/EBS, hybrid storage, object vs file vs block.
- 3.2 Compute: Batch/EMR/Fargate, Auto Scaling, Lambda sizing, instance types.
- 3.3 Database: ElastiCache, read vs write heavy, capacity planning (RCU/WCU, IOPS), proxies, engine choice, replicas, relational vs non-relational vs in-memory vs serverless.
- 3.4 Network: CloudFront, Global Accelerator, subnet tiers/routing/IP addressing, ALB/NLB/GWLB, VPN/Direct Connect/PrivateLink, placement.
- 3.5 Data ingestion/transformation: Athena, Lake Formation, Glue, Kinesis, DataSync/Storage Gateway, EMR, data lakes, csv→parquet.
- 4.x Cost: S3 tiers/lifecycle/Requester Pays, cost allocation tags, Cost Explorer/Budgets/CUR, EBS volume types, Spot/Reserved/Savings Plans, instance families, hibernation, NAT gateway costs (shared vs per-AZ), Direct Connect vs VPN, data transfer paths (region↔region, AZ↔AZ, VPC endpoints), Transit Gateway vs peering, DynamoDB vs RDS, time-series/columnar DBs, DMS/SCT migrations.

### AWS Solutions Architect Professional (SAP-C02; SAP-C03 from 2026-11-17) — advanced
Domains: Organizational Complexity 26%, New Solutions 29%, Continuous Improvement 25%, Migration & Modernization 20%.
Adds over SAA: hybrid DNS (Route 53 Resolver), transitive routing, multi-VPC connectivity, centralized logging/security notifications (Security Hub, Inspector, Access Analyzer), Elastic Disaster Recovery, multi-account governance, rightsizing tools (Compute Optimizer, S3 Storage Lens), deployment strategies (blue/green, rolling, all-at-once) and rollback, CI/CD, Systems Manager, Config rules, patching, DNS routing policies (latency, geolocation), placement groups, SLAs/KPIs, 7 Rs migration, Migration Hub, Application Discovery/Migration Service, Snow Family, DMS/SCT, EventBridge, Aurora Serverless. Emerging: generative-AI guardrails (Bedrock Guardrails), AgentCore Identity, human-approval workflows (Step Functions).

### Google Cloud Digital Leader — beginner
Six sections ~16-17% each: digital transformation & cloud concepts (cloud vs on-prem, public/private/hybrid/multicloud, CapEx/OpEx/TCO, network terms: IP, DNS, regions/zones, latency, bandwidth, IaaS/PaaS/SaaS, shared responsibility), data (databases vs warehouses vs lakes, Cloud Storage classes, Cloud SQL/Spanner/Bigtable/BigQuery/Firestore, Looker, Pub/Sub + Dataflow streaming), AI/ML (pre-trained APIs vs AutoML vs custom, BigQuery ML, Vertex AI, TPUs, responsible AI), infrastructure & app modernization (7 Rs-style migration terms, VMs vs containers vs serverless, GKE, Cloud Run, APIs & Apigee, hybrid/multicloud), trust & security (CIA triad, encryption states, authN vs authZ vs auditing, 2SV, IAM, Cloud Armor/DDoS, SecOps, data residency/sovereignty, compliance), operations (financial governance, quotas/budgets, resource hierarchy, reliability/SRE/DevOps terms, HA/DR, support, sustainability).

### Google Associate Cloud Engineer — intermediate (hands-on)
Sections: setting up environment 20% (resource hierarchy, org policies, IAM roles, Cloud Identity, APIs, quotas, billing accounts/budgets/exports), planning 17.5% (compute choice: Compute Engine/GKE/Cloud Run/Functions, Spot/custom machine types, data product choice, PD zonal vs regional, storage classes, load balancing, Network Service Tiers), deploying 25% (instance templates/MIGs/OS Login, GKE Autopilot/regional/private, Cloud Run + Eventarc, data products incl. AlloyDB, custom/shared VPC, firewall rules by tags/service accounts, Cloud VPN/peering, IaC: Terraform/Config Connector/Helm), operating 20% (snapshots/images, node pools, HPA/VPA, Cloud Run traffic splitting, Cloud Storage lifecycle, backups, subnet expansion, static IPs, Cloud DNS/NAT, Cloud Monitoring/Logging, log sinks/buckets, Ops Agent, Managed Prometheus, audit logs), access & security 17.5% (IAM policies, basic/predefined/custom roles, service accounts, impersonation, short-lived credentials).

### Google Professional Cloud Architect (v6.1) — advanced
Sections: design & plan 25% (business/technical requirements, Well-Architected Framework, HA/failover, cost, integration patterns, data movement, trade-offs, build/buy, KPIs/ROI, observability, cloud-native networking: VPC, peering, firewalls, LBs, Shared VPC, Private Service Connect; storage types; compute mapping GKE/Cloud Run/functions; migration plan via Migration Center, licence impact), manage & provision 17.5% (hybrid/multicloud topologies, storage lifecycle/growth/protection, compute provisioning, spot vs standard, VMware Engine, orchestration/patching, Agent Platform/Vertex pipelines, AI Hypercomputer, GPUs/TPUs, Google AI APIs, Model Garden), security & compliance 17.5% (IAM, resource hierarchy, KMS/CMEK, secrets, separation of duties, VPC Service Controls, context-aware access, org policy, hierarchical firewalls, IAP, Workload Identity Federation, software supply chain, AI security: Model Armor, Sensitive Data Protection; regulations, PII/PCI, SOC 2, audit logs), analyze & optimize 15% (SDLC, CI/CD, RCA, testing, service catalog, DR, stakeholder/change management, CapEx/OpEx, business continuity), manage implementation 12.5% (deployment, Apigee API management, test frameworks, migration tooling, gcloud/gsutil/bq, emulators, Terraform, API client libraries), operations excellence 12.5% (operational-excellence pillar, monitoring/logging/profiling/alerting, release management, support, quality control, chaos engineering, pen testing, load testing). Case studies: Altostrat Media, Cymbal Retail, EHR Healthcare, KnightMotives Automotive.

### Microsoft AZ-900 Azure Fundamentals (as of 2026-07-20) — beginner
Cloud concepts 25-30% (definition, shared responsibility, public/private/hybrid, consumption model, pricing models, serverless, HA/scalability/reliability/predictability/security/governance/manageability benefits, IaaS/PaaS/SaaS), architecture & services 35-40% (regions, region pairs, sovereign regions, AZs, datacenters, resources/resource groups/subscriptions/management groups hierarchy; containers vs VMs vs functions; VM Scale Sets, availability sets, Virtual Desktop; app hosting options; VNets, subnets, peering, Azure DNS, VPN Gateway, ExpressRoute, public vs private endpoints; storage services, tiers, redundancy, AzCopy/Storage Explorer/File Sync, Azure Migrate, Data Box; Entra ID, Domain Services, SSO/MFA/passwordless, external identities, Conditional Access, RBAC, Zero Trust, defence in depth, Defender for Cloud), management & governance 30-35% (cost factors, pricing calculator, Cost Management, tags, Purview, Azure Policy, resource locks, portal/Cloud Shell/CLI/PowerShell, Azure Arc, IaC, ARM/ARM templates, Advisor, Service Health, Monitor/Log Analytics/alerts/Application Insights).

### Microsoft AZ-104 Azure Administrator — intermediate (hands-on)
Identities & governance 20-25% (Entra users/groups/licences/external users/SSPR, built-in roles at scopes, Azure Policy, locks, tags, resource groups, subscriptions, budgets/Advisor, management groups), storage 15-20% (storage firewalls/VNets, SAS tokens, stored access policies, access keys, identity-based Files access, redundancy, object replication, encryption, Storage Explorer/AzCopy, file shares, blob containers, tiers, snapshots/soft delete, lifecycle, versioning), compute 20-25% (ARM/Bicep interpret/modify/deploy/export, VMs, Disk Encryption, moves, sizes/disks, AZs/availability sets, VM Scale Sets, ACR, Container Instances, Container Apps, App Service plans/scaling/TLS/custom DNS/backup/networking/deployment slots), networking 15-20% (VNets/subnets, peering, public IPs, user-defined routes, troubleshooting, NSGs/ASGs, effective rules, Bastion, service endpoints, private endpoints, Azure DNS, internal/public load balancer), monitoring & maintenance 10-15% (Monitor metrics/logs/KQL, alert rules/action groups, Insights, Network Watcher/Connection Monitor, Recovery Services vault, Backup vault, backup policies, Site Recovery failover).

### Microsoft AZ-305 Azure Solutions Architect (as of 2026-04-17) — advanced
Identity, governance, monitoring 25-30% (logging, log routing, monitoring; authentication, identity management, authorising Azure and on-prem access, secrets/certs/keys; management group/subscription/resource group structure, tagging, compliance, identity governance), data storage 20-25% (relational store, service/compute tier, scalability, protection; semi-structured and unstructured stores, feature/performance/cost balance, durability; data integration and analysis), business continuity 15-20% (recovery solutions meeting RTO/RPO for Azure & hybrid, backup/recovery for compute/databases/unstructured data; HA for compute, relational, semi/unstructured), infrastructure 30-35% (compute components, VM-based, container-based, serverless, batch; messaging architecture, event-driven, API integration, caching, app configuration, automated deployment; migrations via Cloud Adoption Framework, assessing servers/data/apps, IaaS/PaaS migration, database migration, unstructured data migration; internet connectivity, on-prem connectivity, network performance, network security, load balancing and routing).

### Cross-exam themes (the content every blueprint shares)
1. Cloud concepts: what cloud is, service models, deployment models, shared responsibility, economics.
2. Global infrastructure: regions, zones, edge, latency; how to pick a region.
3. Account structure and governance: org/folders/projects, management groups/subscriptions, Organizations/OUs/accounts; policies, tags, budgets, quotas.
4. Identity: users/groups/roles/policies, service identities, federation, least privilege, MFA, short-lived credentials.
5. Networking: VPC/VNet, subnets, routing, firewalls (SGs/NACLs/NSGs), NAT, private endpoints, peering, hub-spoke/Transit, VPN/Direct Connect/ExpressRoute/Interconnect, DNS, load balancers L4/L7, CDN, DDoS/WAF.
6. Compute spectrum: VMs → containers → serverless; scaling; instance families; spot/commitment pricing.
7. Storage: object/block/file; tiers; lifecycle; redundancy; transfer services.
8. Databases: relational vs NoSQL vs in-memory vs warehouse vs analytics; replicas, proxies, capacity, migrations.
9. Messaging & events: queues, pub/sub, streams, workflows, event buses.
10. Reliability: HA vs DR, RPO/RTO, DR patterns, multi-AZ/multi-region, failover, quotas, immutable infra.
11. Security: encryption at rest/in transit, key management, secrets, threat detection, zero trust, defence in depth, compliance/audit, data residency.
12. Observability & operations: metrics/logs/traces, alerting, SLIs/SLOs, IaC, CI/CD, deployment strategies, patching, runbooks, chaos/load testing.
13. Cost: pricing models, cost tools, tagging, data-transfer costs, rightsizing, FinOps.
14. Migration & modernization: 7 Rs, assessment, data transfer, database migration, decoupling, serverless adoption.
15. AI/ML on the cloud: managed model platforms, pre-trained APIs, GPUs/TPUs, AI security/guardrails, human-in-the-loop.
16. APIs: API gateways/management (API Gateway, Apigee, Azure API Management), REST vs event integration.
