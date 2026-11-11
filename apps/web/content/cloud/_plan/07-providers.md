## Hub: providers — AWS, Google Cloud and Azure service catalogs

> **Wave 0 status (2026-11-11).** The hub, its `_index.yaml` entry and every page below exist as `status: outline`
> stubs. `RECONCILIATION.md` wins over this brief wherever they disagree (components, page skeleton, answer style,
> what not to re-teach). Reserved diagram ids, owners and kinds: `ASSETS.md`. Terms use `<Term id>` from the one
> glossary, `content/system-design/glossary.yaml`; a page defines a term on first use and has no "Terms you need"
> section. Bullets that start with **Review addition** or **Reconciliation** were added in Wave 0.

For readers who already know the idea (from a concept hub) and now want the real service names, limits and gotchas on one cloud; also for readers who use one cloud at work and want a map to the other two. Read order inside each provider: compute → containers → serverless → networking → edge → storage → databases → caching → messaging → analytics → security → observability → devops → ai-ml (the existing hub category order). Every page's first section links back to the concept page, so a beginner who lands here can go "learn the idea" first and return.

### Categories
Existing hub categories stay (no card changes needed in `aws.mdx`/`gcp.mdx`/`azure.mdx`/`_index.yaml`):
- Compute & Containers → compute, containers, serverless
- Networking & Delivery → networking, edge
- Data & Storage → storage, databases, caching
- Integration & Analytics → messaging, analytics
- Security & Operations → security, observability, devops
- AI & ML → ai-ml

### Pages

#### Rule 1 — Upgrade rule for the 14 AWS pages (mechanical; page keeps its title, slug, card, profiles and prose)
Current state: AWS pages are the strongest (520–1,235 words, 2–4 questions each, 7 have an inline Mermaid, all 14 listed in `articles.yaml`). Changes, in file order:
1. **Frontmatter**: add `status: published` explicitly (schema default; makes the status flip visible) and `updated:`. Nothing else.
2. **New section "The idea" directly after the intro paragraph, before TL;DR**: two sentences in our own words naming the concept, then `<Callout tone="info" title="Learn the idea">` linking the concept page(s) in the table below. Then the concept diagram: `<AnimatedDiagram spec="animated/cloud/<slug>" stepper cloud="aws" caption="…" />` followed by `<ConceptMap spec="animated/cloud/<slug>" lead="aws" />` so the table under the picture shows AWS first with GCP/Azure beside it.
3. **Inline Mermaid**: keep it only if it shows something the concept stepper does not (the "Securing a request end to end" sequence on aws/security, the "Getting a request to the right place" chart on aws/edge). Where the Mermaid is a provider-named copy of the concept picture (aws/networking three-tier VPC, aws/devops pipeline, aws/storage tiers), delete it; the stepper replaces it.
4. **Service profiles**: unchanged; `concept` field on each catalog entry (Need, below) makes `<CloudServiceProfile>` render its own "Idea →" link.
5. **Questions**: bring every page to at least 3 (1 Mid minimum, 1 Senior where the page has one) and rewrite every existing answer into the house style (one-sentence bold decision, 2–3 "- " reasons, a "Trade-off:"/"What breaks:" bullet, optional "Follow-up:"); attach `diagram="animated/cloud/<slug>#step=n"` to at least one question per page. Add: ai-ml 1, analytics 1, caching 1, devops 1, edge 1, observability 1, security 1, storage 1 (8 new); compute/containers/databases/messaging/serverless/networking already have 3–4.
6. **Related**: add the concept page link first; keep the case-study and `/system-design` links.
7. Nothing moves between hubs: any paragraph that teaches a cloud-neutral idea (e.g. aws/compute "Paying for EC2" explaining commitments) stays but gets a "the general idea is on … " link; it does not get expanded.

#### Rule 2 — Rewrite rule for the 28 GCP and Azure pages (stand alone; no AWS prerequisite)
Current state: 188–603 words, 0–2 questions (GCP 11 total, Azure 10), zero diagrams, every page has a "Coming from AWS" table and several intros define the cloud *by contrast to AWS* ("regional like an AWS VPC", "smaller than AWS's"). 13 pages are missing from `articles.yaml` (gcp: ai-ml, caching, devops, edge, observability, security; azure: ai-ml, analytics, caching, devops, edge, observability, storage). Rewrite, section by section, target 600–900 words:
1. **Intro (problem-first)**: rewrite so AWS is not mentioned. State the job this group of services does for Brightpost on this cloud, then the one thing about this cloud that changes a design (GCP: global VPC; Azure: subnets span zones; GCP: Spanner's strong consistency; Azure: Entra ID as the identity root). Any AWS comparison moves into the ConceptMap table, which already shows all three.
2. **"The idea" section**: same as Rule 1 step 2 with `cloud="gcp"` or `cloud="azure"`.
3. **TL;DR**: keep (4 bullets), remove AWS references.
4. **At a glance**: keep `<CloudGroupTable group lead>`.
5. **New section "How it fits together on <cloud>"** (replaces the AWS page's provider-specific Mermaid): one short prose walk-through of the stepper with the provider names, plus a 3–5 row table where that cloud's naming differs from the concept words (e.g. GCP "firewall rules target service accounts", Azure "NSG + application security group"). No new diagram: the stepper in step 2 is the picture.
6. **Services**: keep profiles; add a one-line "pick it when…" under each profile where the page currently has none (most GCP/Azure pages list profiles bare).
7. **Delete "Coming from AWS"**. Replace with `<ConceptMap spec lead="gcp|azure" />` under the diagram (step 2), which already covers the mapping, with the lead column first. The "What actually changes" column's content becomes the table in step 5.
8. **New "Common mistakes" (3 bullets) and "Where this shows up in system design" (2–3 bullets)**, matching the AWS pages' structure.
9. **Related**: concept page first, then the other two providers' same group, then `/system-design`.
10. **Questions**: exactly 3 per page (0–1 Junior, 2 Mid, 0–1 Senior), house style, at least one with `diagram=`. Add rows to `articles.yaml` for the 13 missing pages (`cloud-architecture/gcp` or `/azure`).

#### Table — 42 pages: concept spec embedded, concept page linked, questions to add, exam refs
Spec ids follow the plan §6 naming (`assets/diagrams/animated/cloud/<slug>`); the owning concept hub creates them, provider pages only embed. Concept slugs are the §4 scope names; the stitcher should align them with each hub's final slugs. "Qs" = new questions to reach 3 (AWS existing answers are also rewritten). Toggle = `cloud=` default on the embedded stepper.

| Page | Concept spec (toggle) | Concept page linked | Qs | Exam refs |
|---|---|---|---|---|
| aws/compute | `autoscaling-loop` (aws) | compute/virtual-machines, compute/autoscaling | 0 | SAA 3.2, 4.x Spot/RI; CLF D3 |
| aws/containers | `k8s-cluster-anatomy` (aws) | compute/kubernetes-concepts, compute/containers-and-registries | 0 | SAA 2.1 ECS/EKS |
| aws/serverless | `serverless-request` (aws) | compute/serverless-functions, networking/api-gateways | 0 | SAA 2.1, 3.2 Lambda sizing; SAP EventBridge |
| aws/networking | `vpc-three-tier` (aws) | networking/vpc-and-subnets, networking/private-endpoints | 0 | SAA 1.2, 3.4, 4.x NAT/TGW; SAP multi-VPC |
| aws/edge | `cdn-request-path` (aws) | networking/cdn-edge-and-waf, networking/dns | 1 | SAA 2.1 CDN, 3.4 GA; SAP DNS routing policies |
| aws/storage | `storage-three-shapes` (aws) | data/storage-types, data/object-storage | 1 | SAA 3.1, 4.x S3 tiers, 1.3 backups; CLF D3 |
| aws/databases | `managed-relational-ha` (aws) | data/managed-relational, data/managed-nosql | 0 | SAA 3.3, 2.2 RDS Proxy, 4.x DynamoDB vs RDS |
| aws/caching | `cache-patterns` (aws) | data/managed-caches | 1 | SAA 3.3 ElastiCache, 2.1 caching |
| aws/messaging | `queue-topic-stream` (aws) | data/streaming-and-messaging-services, start-here/queues-vs-streams | 0 | SAA 2.1 queues/pub-sub; SAP EventBridge |
| aws/analytics | `lake-to-warehouse` (aws) | data/warehouses-lakes-and-query-engines | 1 | SAA 3.5, 4.x columnar |
| aws/security | `iam-role-chain` (aws) | fundamentals/identity-and-access, resilience/encryption-and-keys | 1 | SAA 1.1, 1.2, 1.3; CLF D2; SAP centralized security |
| aws/observability | `three-signals` (aws) | operations/observability-on-the-cloud | 1 | SAA 2.2 X-Ray; SAP centralized logging |
| aws/devops | `deployment-strategies` (aws) | operations/ci-cd-and-deployment-strategies, fundamentals/infrastructure-as-code | 1 | SAP deployment strategies, Systems Manager, Config |
| aws/ai-ml | `ai-platform-building-blocks` (aws) | operations/ai-ml-platforms-on-the-cloud, resilience/ai-security | 1 | CLF D3 AI/ML; SAP Bedrock Guardrails, AgentCore |
| gcp/compute | `autoscaling-loop` (gcp) | compute/virtual-machines, compute/autoscaling | 2 | ACE 2.1 compute choice, 3.1 MIGs; DL modernization |
| gcp/containers | `k8s-cluster-anatomy` (gcp) | compute/kubernetes-concepts, compute/serverless-containers-and-paas | 1 | ACE 3.2 GKE Autopilot; PCA 1 compute mapping |
| gcp/serverless | `serverless-request` (gcp) | compute/serverless-functions, networking/api-gateways | 2 | ACE 3.3 Cloud Run + Eventarc; PCA 5 Apigee |
| gcp/networking | `vpc-three-tier` (gcp) | networking/vpc-and-subnets, networking/private-endpoints | 2 | ACE 3.5 VPC/firewall/VPN; PCA 1 Shared VPC, PSC |
| gcp/edge | `cdn-request-path` (gcp) | networking/cdn-edge-and-waf, networking/dns | 3 | ACE 2 Network Service Tiers, 4 Cloud DNS; DL network terms |
| gcp/storage | `storage-three-shapes` (gcp) | data/storage-types, data/object-storage | 2 | ACE 2 PD zonal/regional, storage classes, 4 lifecycle; DL data |
| gcp/databases | `managed-relational-ha` (gcp) | data/managed-relational, data/managed-nosql | 2 | ACE 2 data product choice, 3.4 AlloyDB; DL data; PCA 1 storage types |
| gcp/caching | `cache-patterns` (gcp) | data/managed-caches | 3 | ACE 3.4 data products; PCA 1 |
| gcp/messaging | `queue-topic-stream` (gcp) | data/streaming-and-messaging-services | 2 | DL Pub/Sub + Dataflow; ACE 3.3 Eventarc |
| gcp/analytics | `lake-to-warehouse` (gcp) | data/warehouses-lakes-and-query-engines | 2 | DL data (warehouse vs lake, BigQuery, Looker); PCA 1 data movement |
| gcp/security | `iam-role-chain` (gcp) | fundamentals/identity-and-access, resilience/threat-detection | 3 | ACE 5 IAM/service accounts; PCA 3 KMS/CMEK, VPC SC, IAP; DL trust |
| gcp/observability | `three-signals` (gcp) | operations/observability-on-the-cloud | 3 | ACE 4 Monitoring/Logging, sinks, Managed Prometheus; PCA 6 |
| gcp/devops | `deployment-strategies` (gcp) | operations/ci-cd-and-deployment-strategies, fundamentals/infrastructure-as-code | 3 | ACE 3.6 Terraform/Config Connector; PCA 4 CI/CD, 5 Terraform |
| gcp/ai-ml | `ai-platform-building-blocks` (gcp) | operations/ai-ml-platforms-on-the-cloud, resilience/ai-security | 3 | DL AI/ML (incl. 3.3a BigQuery ML: **review addition**, add a short part on SQL-first ML); PCA 2 Vertex/TPUs/Model Garden, 3 Model Armor |
| azure/compute | `autoscaling-loop` (azure) | compute/virtual-machines, compute/serverless-containers-and-paas | 2 | AZ-900 architecture (VMSS, availability sets); AZ-104 compute; AZ-305 infra |
| azure/containers | `k8s-cluster-anatomy` (azure) | compute/kubernetes-concepts, compute/containers-and-registries | 1 | AZ-104 ACR/ACI/Container Apps; AZ-305 container-based |
| azure/serverless | `serverless-request` (azure) | compute/serverless-functions, networking/api-gateways | 2 | AZ-900 serverless; AZ-305 event-driven, API integration |
| azure/networking | `vpc-three-tier` (azure) | networking/vpc-and-subnets, networking/private-endpoints | 2 | AZ-900 VNets/peering/endpoints; AZ-104 networking; AZ-305 connectivity |
| azure/edge | `cdn-request-path` (azure) | networking/cdn-edge-and-waf, networking/dns | 3 | AZ-900 Azure DNS; AZ-305 internet connectivity, LB and routing |
| azure/storage | `storage-three-shapes` (azure) | data/storage-types, data/object-storage | 3 | AZ-900 storage/tiers/redundancy; AZ-104 storage; AZ-305 unstructured stores |
| azure/databases | `managed-relational-ha` (azure) | data/managed-relational, data/managed-nosql | 2 | AZ-305 relational tiers, semi-structured stores; AZ-104 none |
| azure/caching | `cache-patterns` (azure) | data/managed-caches | 3 | AZ-305 caching |
| azure/messaging | `queue-topic-stream` (azure) | data/streaming-and-messaging-services | 2 | AZ-305 messaging architecture, event-driven |
| azure/analytics | `lake-to-warehouse` (azure) | data/warehouses-lakes-and-query-engines | 3 | AZ-305 data integration and analysis; AZ-900 Purview |
| azure/security | `iam-role-chain` (azure) | fundamentals/identity-and-access, resilience/zero-trust | 2 | AZ-900 Entra/Conditional Access/Zero Trust/Defender; AZ-104 identities; AZ-305 identity & governance |
| azure/observability | `three-signals` (azure) | operations/observability-on-the-cloud | 3 | AZ-900 Monitor/Log Analytics/App Insights; AZ-104 monitoring; AZ-305 logging |
| azure/devops | `deployment-strategies` (azure) | operations/ci-cd-and-deployment-strategies, fundamentals/infrastructure-as-code | 3 | AZ-900 IaC/ARM; AZ-104 ARM/Bicep; AZ-305 automated deployment |
| azure/ai-ml | `ai-platform-building-blocks` (azure) | operations/ai-ml-platforms-on-the-cloud, resilience/ai-security | 3 | AZ-305 none directly; cross-exam theme 15 |

New questions: AWS 8, GCP 33, Azure 34 = 75; after the pass every provider page has ≥ 3 (aws/containers keeps 4).

#### 1. aws/networking — Networking on AWS (Intermediate, ~1,000 words; today 869)
- Scope: How Brightpost's VPC is laid out inside one Region on AWS, which service does each networking job, and the AWS-only facts (security groups reference each other, NAT per zone, gateway endpoints are free) that change a design.
- Sections: The idea (link + stepper + ConceptMap) · TL;DR · At a glance · Security groups by tier (the existing 4-row table, kept) · Services (VPC, ELB with the ALB/NLB table, Transit Gateway, PrivateLink, VPC Lattice, Direct Connect) · Where this shows up in system design · Common mistakes · Related · Questions.
- Diagrams: (1) animated stepper `animated/cloud/vpc-three-tier`, `cloud="aws"`: step 1 "One VM in one public subnet" (EC2 + internet gateway; nothing fails yet) → step 2 "Split into public and private subnets" (ALB public, app private, Aurora/ElastiCache data subnets; the DB is no longer reachable from the internet) → step 3 "Three zones" (every tier copied across 3 AZs; alternative: the single-zone layout is the failure) → step 4 "Outbound without exposure" (NAT gateway per zone, S3/DynamoDB gateway endpoints) → step 5 "Zone b fails" (red fault on AZ b; traffic keeps flowing through a and c; the one-NAT-for-three-zones mistake is the failure step). (2) widget `<ConceptMap spec="animated/cloud/vpc-three-tier" lead="aws" />`. The current inline Mermaid three-tier chart is removed (duplicate of step 4).
- Reuses: `<CloudGroupTable group="networking" lead="aws">`, profiles aws-vpc, aws-elb, aws-transit-gateway, aws-privatelink, aws-vpc-lattice, aws-direct-connect; the ALB/NLB table and SG table; existing 3 questions rewritten.
- Needs: `cloud=` default prop on `<AnimatedDiagram>` (toggle currently starts at "generic"); `<ConceptMap>`; `concept` field on the six catalog entries; spec `vpc-three-tier` from the networking hub (zones `kind: region/vpc/subnet`, nodes with `cloud:{aws:'aws-vpc'|'aws-elb'|'aws-aurora'|'aws-elasticache', gcp:'gcp-vpc'|'gcp-cloud-load-balancing'|'gcp-cloud-sql'|'gcp-memorystore', azure:'azure-vnet'|'azure-app-gateway'|'azure-sql'|'azure-managed-redis'}`; NAT uses `{label:"NAT gateway"}`/`gcp:{label:"Cloud NAT"}`/`azure:{label:"NAT Gateway"}` since no catalog id exists).
- Questions: 3 (0J/2M/1S), rewritten in house style with `diagram=`: "Security groups vs network ACLs?" (Junior→ keep as Mid-light, diagram `#step=2`); "ALB or NLB in front of WebSocket servers?" (Mid); "Your NAT gateway bill is huge: what do you check?" (Mid → Senior, diagram `#step=4`, "What breaks:" bullet on the single-NAT zone failure).
- Exams: SAA 1.2 (SG/NACL, subnets, endpoints), SAA 3.4 (ALB/NLB, PrivateLink), SAA 4.x (NAT costs, TGW vs peering), SAP organizational complexity (multi-VPC, transitive routing); cross-exam theme 5.
- Links: /cloud/networking/vpc-and-subnets, /cloud/networking/private-endpoints, /cloud/networking/load-balancing, /cloud/aws/edge, /cloud/aws/containers, /cloud/gcp/networking, /cloud/azure/networking, /system-design/patterns/load-balancing, /system-design/case-studies/facebook-messenger.

#### 2. gcp/databases — Databases on Google Cloud (Intermediate, ~800 words; today 402)
- Scope: Which Google Cloud database fits each of Brightpost's access patterns (orders, catalog, sessions, analytics-scale events), explained on its own terms: Cloud SQL and AlloyDB for relational, Spanner when one primary is not enough, Firestore for serverless documents, Bigtable for huge write-heavy tables.
- Sections: The idea (link + stepper + ConceptMap) · TL;DR · At a glance · How it fits together on Google Cloud (prose walk of the stepper with GCP names; table: regional vs multi-region Cloud SQL, Spanner nodes vs processing units, Firestore modes, Bigtable key design) · Services (Cloud SQL, AlloyDB, Spanner with the hotspot paragraph kept, Firestore, Bigtable) · Where this shows up in system design · Common mistakes · Related · Questions.
- Diagrams: (1) animated stepper `animated/cloud/managed-relational-ha`, `cloud="gcp"`: step 1 "One managed database" (app → Cloud SQL primary) → step 2 "Standby in a second zone" (synchronous standby; failover arrow dashed) → step 3 "Read replicas take the reads" (async replicas, "replication lag" label) → step 4 "A connection pool in front" (Cloud SQL Auth Proxy / AlloyDB; the failure shown: serverless fan-out exhausts connections) → step 5 "The zone fails" (primary zone faulted, standby promoted, replicas re-point; alternative step: when even this is not enough, the "distributed SQL" node appears, Spanner/Aurora DSQL/—). (2) widget `<ConceptMap spec="animated/cloud/managed-relational-ha" lead="gcp" />`. The "Coming from AWS" table is deleted; its "what changes" rows become the GCP-naming table.
- Reuses: `<CloudGroupTable group="databases" lead="gcp">`, profiles gcp-cloud-sql, gcp-alloydb, gcp-spanner, gcp-firestore, gcp-bigtable; the existing Spanner hotspot question (rewritten).
- Needs: spec `managed-relational-ha` from the data hub with node `cloud` ids (`aws-rds`/`aws-aurora`, `gcp-cloud-sql`/`gcp-alloydb`, `azure-sql`/`azure-postgresql`; alternative node `aws-aurora-dsql`/`gcp-spanner`/`{label:"Cosmos DB (no strong multi-region)"}`); `articles.yaml` row already exists; `concept` catalog field; no new glyph (database glyph exists).
- Questions: 3 (1J/1M/1S): "When would you move Brightpost's orders from Cloud SQL to Spanner?" (Mid, diagram `#step=5`); "What does a Cloud SQL high-availability instance protect against, and what does it not?" (Junior, diagram `#step=2`, "What breaks:" replication lag is not covered by HA); "Why do sequential primary keys hurt in Spanner and Bigtable?" (Senior, existing, rewritten with a Follow-up on bit-reversed sequences).
- Exams: ACE 2.x (data product choice), ACE 3.4 (Cloud SQL/AlloyDB deploy), DL data (Cloud SQL/Spanner/Bigtable/Firestore), PCA 1 (storage types, HA/failover); cross-exam theme 8.
- Links: /cloud/data/managed-relational, /cloud/data/managed-nosql, /cloud/start-here/databases-per-cloud, /cloud/aws/databases, /cloud/azure/databases, /cloud/gcp/caching, /system-design/databases/newsql-databases, /system-design/databases/wide-column (link only; no theory re-taught).

#### 3. azure/security — Identity & Security on Azure (Intermediate, ~850 words; today 380)
- Scope: How a request to Brightpost on Azure is authenticated, authorised and protected end to end: Entra ID as the identity root, managed identities so services never hold secrets, Azure RBAC and Policy as the two kinds of "allowed", Key Vault for keys and secrets, WAF/DDoS at the edge, Defender for Cloud watching posture.
- **Review addition:** add Entra admin details: guest users, self-service password reset and licences. (AZ-104 identities)
- Sections: The idea (link + stepper + ConceptMap) · TL;DR · At a glance · How it fits together on Azure (prose walk; table: RBAC vs Policy vs Conditional Access, scopes = management group/subscription/resource group/resource, managed identity system- vs user-assigned, Key Vault RBAC vs access policies) · Services (Entra ID, Key Vault, WAF, Defender for Cloud) · Where this shows up in system design · Common mistakes · Related · Questions.
- Diagrams: (1) animated stepper `animated/cloud/iam-role-chain`, `cloud="azure"`: step 1 "A person signs in" (user → identity provider → token; glyphs users, key) → step 2 "A workload gets its own identity" (app server gets a managed identity; no password anywhere) → step 3 "Permissions are granted at a scope" (role assignment on the resource group; the arrow to Key Vault is allowed, the arrow to the production database is denied) → step 4 "Secrets stay in the vault" (app reads the DB connection string from Key Vault with its identity; lock glyph) → step 5 "A leaked key" (failure: an exported key in a config file; red; the stepper shows that with a managed identity there is no key to leak, and that Policy would have denied the storage account with public access). (2) widget `<ConceptMap spec="animated/cloud/iam-role-chain" lead="azure" />`.
- Reuses: `<CloudGroupTable group="security" lead="azure">`, profiles azure-entra-id, azure-key-vault, azure-waf, azure-defender; the existing Key Vault question (rewritten, becomes the Junior one with `#step=4`).
- Needs: spec `iam-role-chain` from the fundamentals hub (node cloud ids: identity `aws-iam`/`gcp-iam`/`azure-entra-id`; vault `aws-secrets-manager`+`aws-kms`/`gcp-secret-manager`/`azure-key-vault`; edge `aws-waf`/`gcp-cloud-armor`/`azure-waf`; posture `aws-security-hub`/`gcp-scc`/`azure-defender`); glyphs key, lock, shield exist, a `firewall` glyph is wanted for the WAF node (plan §6 glyph PR); `<ResponsibilityGrid set="shared-responsibility">` embedded once as the Try-it (planned set).
- Questions: 3 (1J/1M/1S): "How does an Azure Function read a secret from Key Vault without storing credentials?" (Junior, diagram `#step=4`); "Azure RBAC, Azure Policy or Conditional Access: which one stops a developer creating a public storage account?" (Mid, diagram `#step=3`, "Trade-off:" Policy deny blocks IaC pipelines too); "Design access for Brightpost's three teams across two subscriptions so nobody gets Owner" (Senior; management group → subscription → resource group scopes, PIM for just-in-time, Follow-up on break-glass accounts).
- Exams: AZ-900 identity (Entra ID, MFA, Conditional Access, RBAC, Zero Trust, defence in depth, Defender), AZ-104 identities & governance (roles at scopes, Policy, locks), AZ-305 identity/governance (authN/authZ, secrets/keys, management group structure); cross-exam themes 4 and 11.
- Links: /cloud/fundamentals/identity-and-access, /cloud/fundamentals/accounts-and-governance, /cloud/resilience/encryption-and-keys, /cloud/resilience/secrets-management, /cloud/resilience/zero-trust, /cloud/aws/security, /cloud/gcp/security, /system-design/fundamentals/security, /system-design/patterns/rate-limiting.

### Hub totals
- Pages: 42 existing, 0 new (14 AWS upgraded in place, 28 GCP/Azure rewritten). Words: ≈ 24,500 after (AWS 14 × ~900 unchanged ±10%; GCP/Azure 28 × ~750, up from ~330 average).
- Diagrams by type: 42 animated steppers (14 distinct concept specs embedded 3× each: `autoscaling-loop`, `k8s-cluster-anatomy`, `serverless-request`, `vpc-three-tier`, `cdn-request-path`, `storage-three-shapes`, `managed-relational-ha`, `cache-patterns`, `queue-topic-stream`, `lake-to-warehouse`, `iam-role-chain`, `three-signals`, `deployment-strategies`, `ai-platform-building-blocks`); 42 `<ConceptMap>` widgets; mermaid inline: keep 4 on AWS (security request sequence, edge request routing, ai-ml, analytics), delete 3 duplicates (networking, devops, storage); 0 new mermaid assets; 0 svg.
- Questions: 75 new (AWS 8, GCP 33, Azure 34) + 54 existing rewritten to house style = 129 on provider pages, every page ≥ 3, every page with ≥ 1 `diagram=` reference; 13 new `articles.yaml` rows (gcp: ai-ml, caching, devops, edge, observability, security; azure: ai-ml, analytics, caching, devops, edge, observability, storage).
- New assets owned by this hub: none (all 14 specs are created by the concept hubs; this hub depends on them existing first, so provider upgrades run after Waves 3–6, 10 pages at a time as the plan says).
- New glyphs/trees/sets/code needed from Wave 1: `cloud=` initial-toggle prop on `<AnimatedDiagram>`; `<ConceptMap spec lead>`; `concept?: string` on `CloudService` plus the "Idea →" link in `<CloudServiceProfile>`; `InterviewQuestion diagram=`; `firewall` glyph (WAF nodes); `ResponsibilityGrid` sets `shared-responsibility`, `gcp-compute`, `azure-compute` (used as the Try-it on security and compute pages); no new decision trees (provider pages link the concept page's tree rather than embedding one).
- Shared-file touches per page PR: one `articles.yaml` row (13 pages) and nothing in hub MDX/`_index.yaml` (cards unchanged), so all 42 can run in parallel.
