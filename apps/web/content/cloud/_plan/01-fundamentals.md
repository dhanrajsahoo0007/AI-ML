## Hub: fundamentals — Fundamentals

> **Wave 0 status (2026-11-11).** The hub, its `_index.yaml` entry and every page below exist as `status: outline`
> stubs. `RECONCILIATION.md` wins over this brief wherever they disagree (components, page skeleton, answer style,
> what not to re-teach). Reserved diagram ids, owners and kinds: `ASSETS.md`. Terms use `<Term id>` from the one
> glossary, `content/system-design/glossary.yaml`; a page defines a term on first use and has no "Terms you need"
> section. Bullets that start with **Review addition** or **Reconciliation** were added in Wave 0.

For anyone who has never designed on a cloud, or who knows one provider and wants the ideas that are the same on all three. Read in order: the first three pages explain what you are renting and where it runs; the next two explain who is trusted to do what; the following three show how a company organises and pays for an estate; the last two give the habits of a good design (asking the pillar questions, writing infrastructure as code). Brightpost, our running shop, appears on every page: it starts as one VM in page 1 and ends page 10 described in a Terraform module.

### Categories
- **What You Are Renting** → what-is-cloud, service-models, regions-zones-edge
- **Who Is Trusted** → shared-responsibility, identity-and-access
- **Organising and Paying for an Estate** → accounts-and-governance, landing-zones, pricing-basics
- **Designing and Building Well** → well-architected-thinking, infrastructure-as-code

### Pages

#### 1. what-is-cloud — What the Cloud Is (Beginner, ~1,600 words)
- Scope: Why renting computers by the minute from a provider changed how systems are built: elasticity, paying for use, and the four deployment models (public, private, hybrid, multicloud). Defines "provider", "tenant", "elastic", "CapEx vs OpEx" in plain words.
- **Review addition:** this is the hub's first page, so it embeds `cloud/brightpost-grows` at the step that matches the hub (step 1, one rented VM) before its own diagrams. The spec is owned by `start-here/cloud-in-10-minutes`.
- Sections: The problem: Brightpost's server in a cupboard · What "the cloud" actually is · Elasticity: capacity that follows demand · Paying for use instead of buying ahead · Public, private, hybrid, multicloud · What breaks · Try it · On AWS / Google Cloud / Azure · Common mistakes · Related · Interview questions
- Diagrams:
  1. animated stepper `animated/cloud/one-server-to-elastic`: step 1 "One server in the office" (one `server` node, users); step 2 "Launch-day spike" (fails: requests dropped, server red); step 3 "Rent a bigger VM" (cloud region zone appears, VM replaces server); step 4 "Add VMs when busy" (autoscaled group, LB); step 5 "Scale back at night" (VMs fade; cost label falls).
  2. mermaid inline: the four deployment models as four boxes with where the data centre is and who owns it.
  3. widget `<ScenarioGrid>`: three Brightpost moments (steady, Black Friday, new country) → which model/benefit matters.
- Reuses: glyphs server, users, load-balancer, globe; zone kind region; catalog aws-ec2, gcp-compute-engine, azure-vm, aws-elb, gcp-cloud-load-balancing, azure-load-balancer; CloudTabs + ConceptMap (Wave 1).
- Needs: optional glyph `datacenter` (rack outline) for the on-prem node; otherwise lucide `server` fallback.
- Questions: 4 (1J/2M/1S): "What does elastic mean, in one sentence?" · "When is hybrid cloud a real requirement rather than a habit?" · "Brightpost's CFO says cloud is more expensive than their old servers. What would you check?"
- Exams: CLF D1 (value of cloud, CapEx→OpEx), DL cloud concepts, AZ-900 cloud concepts (definition, deployment models, consumption model).
- Links: service-models, pricing-basics, regions-zones-edge, /cloud/operations/migration-and-modernization, /system-design/fundamentals/non-functional-requirements.

#### 2. service-models — Service Models: How Much Do You Run? (Beginner, ~1,700 words)
- Scope: The control ladder from a bare VM to a finished product (IaaS, PaaS, FaaS, SaaS) and the three ways to run anything: self-managed, managed, serverless. Teaches the rule "pick the most managed option that meets the requirement".
- Sections: The problem: who patches the database at 3 a.m.? · The ladder: IaaS, PaaS, FaaS, SaaS · Self-managed vs managed vs serverless · What you give up as you climb · What breaks · Try it · On AWS / Google Cloud / Azure · Common mistakes · Related · Interview questions
- Diagrams:
  1. animated single (layout kind) `animated/cloud/service-model-ladder`: five columns (on-prem, IaaS, PaaS, FaaS, SaaS) with the same eight layers (hardware → data); provider-run layers tinted, yours left plain; highlight ring on the layer that moves.
  2. widget `<ResponsibilityGrid set="aws-compute">` (existing) as the "Try it" with a short note that the same grid exists per cloud.
  3. mermaid inline: cost shape over load for self-managed, managed, serverless (three lines, one crossover).
- Reuses: ResponsibilityGrid aws-compute; CloudDecisionTree topic compute (link, not embed); catalog aws-ec2 / aws-fargate / aws-lambda, gcp-compute-engine / gcp-cloud-run / gcp-cloud-run-functions, azure-vm / azure-container-apps / azure-functions, aws-rds / gcp-cloud-sql / azure-postgresql.
- Needs: none.
- Questions: 4 (1J/2M/1S): "Is a managed database IaaS or PaaS, and why does it matter?" · "Brightpost runs Postgres on a VM. Argue for and against moving to the managed engine." · "Where does serverless become the expensive choice?"
- Exams: CLF D1/D3 (service models, compute categories), DL cloud concepts (IaaS/PaaS/SaaS), AZ-900 cloud concepts (service types, serverless).
- Links: shared-responsibility, /cloud/start-here/choosing-compute, /cloud/compute/serverless-functions, /cloud/compute/serverless-containers-and-paas, /cloud/data/managed-relational.

#### 3. regions-zones-edge — Regions, Zones and the Edge (Beginner, ~1,900 words)
- Scope: Where a cloud physically runs, what fails together, and how to pick a region (latency, residency, service availability, price, pairing). Defines region, zone, edge location, latency, failure domain.
- Sections: The problem: one building, one power feed · Regions and zones · What fails together · The edge: being near the user · Picking a region (five questions) · What breaks · Try it · On AWS / Google Cloud / Azure · Common mistakes · Related · Interview questions
- Diagrams:
  1. animated stepper `animated/cloud/region-zone-edge`: step 1 "One zone" (region zone, one subnet, VM + DB); step 2 "Two zones" (LB, second VM, DB replica); step 3 "Zone A loses power" (fails: zone A nodes red, traffic shifts to B); step 4 "Edge for far users" (edge zone, CDN node); step 5 "A second region, previewed" (dashed replication; caption links resilience).
  2. mermaid inline: picking a region as a flow (residency? → needed services? → latency to users? → price/pair).
  3. widget `<ScenarioGrid>`: Brightpost opens in Germany, in Brazil, adds a video feature → which question decides.
- Reuses: zone kinds region/subnet; glyphs server, database, load-balancer, cdn, phone; catalog aws-elb / gcp-cloud-load-balancing / azure-load-balancer, aws-cloudfront / gcp-cloud-cdn / azure-front-door, aws-rds / gcp-cloud-sql / azure-postgresql. Existing table from start-here/cloud-basics moves here.
- Needs: none (new spec only). AWS Local Zone / Azure Extended Zone / GCP edge named with {label}.
- Questions: 5 (1J/3M/1S): "What is the difference between a region and a zone?" · "Why spread across three zones rather than two?" · "Brightpost's users are in India and the UK; where do you deploy and why?" · "Which costs rise when you run in two regions?"
- Exams: CLF D3 (global infrastructure), SAA 2.2 (Regions/AZs), DL cloud concepts (regions/zones/latency), ACE 2.x (zonal vs regional), AZ-900 architecture (regions, pairs, sovereign regions, AZs).
- Links: /cloud/resilience/availability-math, /cloud/resilience/multi-region, /cloud/networking/cdn-edge-and-waf, /cloud/resilience/compliance-and-residency, /system-design/fundamentals/networking.

#### 4. shared-responsibility — Shared Responsibility (Beginner, ~1,500 words)
- Scope: The line between what the provider secures and what stays yours, and how the line moves as a service becomes more managed. The reader leaves able to list their own jobs on any stack.
- Sections: The problem: "but the cloud is secure" · The line and who stands on each side · How the line moves (VM → container → serverless → SaaS) · Always yours, whatever you buy · What breaks · Try it · On AWS / Google Cloud / Azure · Common mistakes · Related · Interview questions
- Diagrams:
  1. animated stepper (layout kind) `animated/cloud/responsibility-line`: step 1 "VM: the line is low" · step 2 "Managed container: runtime moves across" · step 3 "Serverless: scaling and OS move across" · step 4 "Public bucket (failure): the data layer never moves" (highlight ring on data, red).
  2. widget `<ResponsibilityGrid set="shared-responsibility">` as Try it (rows: data, identity, code, network rules, OS, runtime, hardware).
- Reuses: layout spec kind; catalog aws-ec2 / aws-fargate / aws-lambda / aws-s3 and GCP/Azure equivalents for the tabs.
- Needs: responsibility set `shared-responsibility` (planned); no glyphs.
- Questions: 4 (1J/2M/1S): "On a fully serverless stack, what is still your job?" · "Who is responsible when a managed database is reachable from the internet?" · "How does the line change between EKS/GKE/AKS and Fargate/Cloud Run/Container Apps?"
- Exams: CLF D2 (shared responsibility), DL trust & security, AZ-900 cloud concepts (shared responsibility), SAA 1.2 (securing workloads, framing).
- Links: identity-and-access, service-models, /cloud/resilience/encryption-and-keys, /cloud/resilience/zero-trust, /system-design/fundamentals/security.

#### 5. identity-and-access — Identity and Access (Intermediate, ~2,600 words) — PILOT
- Scope: How a cloud decides whether a request is allowed: who is calling (people, workloads), what they are allowed to do (roles and policies), and why short-lived, scoped credentials beat keys in code. Defines principal, authentication vs authorization, role, policy, service identity, federation, MFA, least privilege, before any product name.
- Sections: The problem: Brightpost's leaked key · Authentication, then authorization · Principals: people and workloads · Roles and policies: what "allowed" means · Service identities: how a VM proves who it is · Short-lived credentials · Least privilege in practice · People: groups, SSO, federation, MFA · Across accounts and projects · What breaks · Try it · On AWS / Google Cloud / Azure · Common mistakes · Related · Interview questions
- Diagrams:
  1. animated stepper `animated/cloud/iam-role-chain` (Services toggle on every node): step 1 "A key in the code" — VM (teal) reads orders bucket (violet) with a static key; works. step 2 "The key leaks" (fails) — attacker node (red) uses the same key from outside; bucket contents copied. step 3 "Attach a service identity" — key removed; red `key` glyph replaced by `shield` identity attached to VM; identity service (red) issues a short-lived credential; VM reads bucket. step 4 "Least privilege" — policy document node: one bucket, read only; a write attempt is drawn and refused. step 5 "People sign in through one door" — users → identity provider (federated SSO, MFA) → group → role; no long-lived user keys. step 6 "Reach the audit account" — Brightpost app assumes a role in a second account/project to write logs; dashed control-plane edge, cross-boundary zone. Cloud refs: aws-iam / gcp-iam / azure-entra-id for the identity service; {IAM role | service account | managed identity} for the attached identity; aws-s3 / gcp-cloud-storage / azure-blob for the bucket; {IAM Identity Center | Cloud Identity | Entra ID} for SSO; aws-cloudtrail / gcp-cloud-logging / azure-monitor for audit.
  2. mermaid asset `mermaid/cloud/sts-assume-role`: sequence of a workload getting a short-lived credential: app → local metadata/token endpoint → identity service → credential with expiry → bucket call → refresh before expiry.
  3. mermaid inline: policy evaluation order as a flow: explicit deny? → organisation guardrail allows? → identity policy allows? → resource policy allows? → allow.
  4. widget `<CloudDecisionTree topic="identity-type">`: "Who is calling?" (a person / a workload in this cloud / a workload elsewhere, e.g. CI or on-prem / a customer of your app) → user+SSO / attached role / workload identity federation / customer identity service (points to Networking & APIs for CIAM detail).
- Reuses: glyphs key, shield, lock, users, server, blob, log; red tone for identity; catalog ids above plus aws-cognito / gcp-identity-platform / {Entra External ID} named in the tabs; InterviewQuestion diagram= (Wave 1); CloudTabs; ConceptMap.
- Needs: decision tree `identity-type`; optional glyph `policy` (document with tick), otherwise lucide `scroll-text`; catalog `concept` field pointing aws-iam, gcp-iam, azure-entra-id back to this page.
- Questions: 5 (1J/3M/1S), each with the diagram id:
  1. Junior — "What is the difference between authentication and authorization?" → **Authentication proves who you are; authorization decides what that identity may do**; cloud IAM is mostly the second. (diagram iam-role-chain#step=3)
  2. Mid — "How does a VM read from a bucket without any key in its configuration?" → **An identity attached to the VM** obtains short-lived credentials from a local endpoint; the policy on that identity scopes the bucket. (sts-assume-role)
  3. Mid — "Why are short-lived credentials safer than a long-lived key, if both can leak?" → **A leaked short-lived token expires in minutes and is bound to one identity**, so the blast radius and window are small; rotation is automatic. (iam-role-chain#step=2)
  4. Mid — "Design least privilege for Brightpost's image-resize worker." → **One identity per workload, read on the uploads bucket, write on the thumbnails bucket, nothing else**; deny-by-default and audit logs catch drift. (iam-role-chain#step=4)
  5. Senior — "A contractor's CI system outside the cloud must deploy to production. How does it authenticate?" → **Workload identity federation: the CI's own token is exchanged for a short-lived cloud credential**; no stored key, scoped role, logged. Follow-up: how do you limit it to one branch? (iam-role-chain#step=6)
- Exams: SAA 1.1 (users/groups/roles/policies, STS, federation, MFA, least privilege, root), CLF D2 (IAM basics), SAP organisational complexity (cross-account access), ACE 5.x (IAM roles, service accounts, impersonation, short-lived credentials), PCA 3.x (IAM, Workload Identity Federation, separation of duties), DL trust & security (authN vs authZ, 2SV), AZ-900 architecture (Entra ID, SSO/MFA/passwordless, RBAC), AZ-104 identities, AZ-305 identity.
- Links: shared-responsibility, accounts-and-governance, landing-zones, /cloud/resilience/secrets-management, /cloud/resilience/zero-trust, /cloud/networking/api-gateways, /cloud/aws/security, /cloud/gcp/security, /cloud/azure/security, /system-design/fundamentals/security.

#### 6. accounts-and-governance — Accounts, Projects and Governance (Intermediate, ~1,900 words)
- Scope: The containers a cloud gives you to hold resources (accounts, projects, subscriptions), the tree above them, and the four governance tools that hang on the tree: policies that forbid, tags that label, quotas that cap, budgets that warn.
- **Review addition:** cover resource locks (a setting that stops a resource being deleted or changed even by someone with permission) beside policies, tags, quotas and budgets. (AZ-900, AZ-104)
- Sections: The problem: one bill, one blast radius · The container: account, project, subscription · The tree above it · Guardrails: policies that even admins cannot cross · Tags: naming so cost and ownership are visible · Quotas and limits · Budgets and alerts · What breaks · Try it · On AWS / Google Cloud / Azure · Common mistakes · Related · Interview questions
- Diagrams:
  1. animated single `animated/cloud/resource-hierarchy`: one tree with the Services toggle renaming each level: {Organization | Organization | Tenant} → {OU | Folder | Management group} → {Account | Project | Subscription} → {— | — | Resource group} → resources; a guardrail badge at the second level with a dashed "inherits" edge downward.
  2. mermaid inline: tag → cost report → owner loop (why tags exist).
  3. widget `<DataModelView>` tabs: the same policy example (deny public buckets, allowed regions) written as SCP / organisation policy / Azure Policy, one line each in prose, no vendor JSON.
- Reuses: glyphs folder, tree, shield, chart; catalog aws-cloudwatch / gcp-cloud-monitoring / azure-monitor for budget alerts; {label} for Organizations, Resource Manager, Management groups, Budgets, Cost Management.
- Needs: none.
- Questions: 4 (1J/2M/1S): "Why does a company have more than one account or project?" · "A developer hits a VM quota during a launch; what should have happened earlier?" · "Where do you place a rule that nobody may create resources outside two regions?"
- Exams: SAA 1.1 (Organizations, SCPs), SAP organisational complexity (multi-account governance), CLF D2/D4 (governance, budgets), ACE 1.x (resource hierarchy, org policies, quotas, budgets), DL operations (resource hierarchy, quotas/budgets), AZ-900 management (management groups/subscriptions/resource groups, Policy, locks, tags, Cost Management), AZ-104 identities & governance, AZ-305 governance.
- Links: landing-zones, identity-and-access, pricing-basics, /cloud/operations/finops-and-cost-tools, /cloud/resilience/quotas-and-retries.

#### 7. landing-zones — Landing Zones: Setting Up an Estate (Intermediate, ~2,000 words)
- Scope: The standard shape of a multi-account estate (prod and non-prod separated; shared identity, logging, security and network containers; guardrails at the tree) and why every provider now offers a blueprint for it.
- Sections: The problem: Brightpost's dev script deletes the prod table · What a landing zone is · Separate by blast radius, then by team · The shared containers: identity, logs, security, network · Guardrails and baselines · When one account is enough · What breaks · Try it · On AWS / Google Cloud / Azure · Common mistakes · Related · Interview questions
- Diagrams:
  1. animated stepper `animated/cloud/landing-zone`: step 1 "One account for everything" · step 2 "A dev script hits prod" (fails: prod DB red) · step 3 "Split prod and non-prod under one tree" · step 4 "Shared identity and log archive" (users sign in once; logs flow from every account to an immutable archive) · step 5 "Security tooling and the network hub" (dashed edges; hub links the networking hub page) · step 6 "Guardrails at the tree" (policy badge on the OU/folder/MG, inherited).
  2. mermaid inline: "how many accounts?" decision: regulated? teams? prod/non-prod? → suggested starting set.
  3. widget `<CloudDecisionTree topic="account-structure">`: one team startup / several teams / regulated company → starting layout.
- Reuses: resource-hierarchy spec (embedded at step 1 for recap); glyphs folder, shield, log, users, dns; catalog aws-cloudtrail / gcp-cloud-logging / azure-monitor, aws-security-hub / gcp-scc / azure-defender, aws-transit-gateway / {Shared VPC} / {Virtual WAN}; {Control Tower | Cloud Foundation Fabric / setup checklist | Landing zone accelerator} with labels.
- Needs: decision tree `account-structure`.
- Questions: 5 (1J/3M/1S): "What is a landing zone, in plain words?" · "Why keep logs in a separate account that application teams cannot write to?" · "Brightpost has three teams and one product; sketch the account layout." · "What goes wrong if guardrails are set per account instead of at the tree?"
- Exams: SAA 1.1 (multi-account, Control Tower), SAP organisational complexity (centralised logging, multi-account governance), PCA 1.x/3.x (resource hierarchy, org policy), ACE 1.x, AZ-305 identity/governance (management group and subscription structure), AZ-900 management.
- Links: accounts-and-governance, identity-and-access, /cloud/networking/connecting-networks, /cloud/resilience/threat-detection, /cloud/operations/observability-on-the-cloud, infrastructure-as-code.

#### 8. pricing-basics — How Cloud Pricing Works (Beginner, ~1,700 words)
- Scope: The handful of meters every bill is built from (time, storage, requests, data out), the three ways to buy compute (on demand, commitment, spot), and free tiers. No prices: shapes, not numbers. Detailed cost tools and FinOps live in Operations.
- **Review addition:** new H2 "Support plans and getting help": provider support tiers, health dashboards and status pages, as concepts only, with no prices. (CLF D4, DL 6.2)
- Sections: The problem: the surprise bill · The four meters · Pay as you go · Commitments: paying less for promising · Spot: paying least for accepting interruption · Free tiers and credits · Reading a design for its cost shape · What breaks · Try it · On AWS / Google Cloud / Azure · Common mistakes · Related · Interview questions
- Diagrams:
  1. animated single (layout kind) `animated/cloud/cost-levers`: Brightpost's three-tier stack with a meter badge on each component naming what it is billed by (VM: hours; DB: hours + storage; bucket: GB-month + requests; LB: hours + GB; NAT/egress: GB out).
  2. mermaid inline: load over a day with the on-demand, commitment and spot bands drawn under it.
  3. widget `<CloudDecisionTree topic="cost-model">` (planned): steady vs spiky vs interruptible → purchasing option.
- Reuses: glyphs server, database, blob, load-balancer, gateway; lucide dollar-sign for badges; catalog aws-ec2 / gcp-compute-engine / azure-vm, aws-s3 / gcp-cloud-storage / azure-blob; capability ids `spot`, `commitments` from compute.ts.
- Needs: decision tree `cost-model` (planned); optional glyph `meter`.
- Questions: 4 (1J/2M/1S): "Name the four things a cloud bill is usually made of." · "When does a commitment make sense for Brightpost's web tier?" · "Where does data-transfer cost hide in a three-tier design?"
- Exams: CLF D4 (pricing models, cost tools), SAA 4.x (Spot/Reserved/Savings Plans, data-transfer paths), DL cloud concepts (CapEx/OpEx/TCO), ACE 2.x (Spot), AZ-900 management (cost factors, pricing calculator, consumption model).
- Links: /cloud/operations/cloud-cost-models, /cloud/operations/finops-and-cost-tools, /cloud/networking/nat-and-egress, /cloud/data/object-storage, what-is-cloud.

#### 9. well-architected-thinking — Well-Architected Thinking (Intermediate, ~1,800 words)
- Scope: The pillars every provider publishes (operational excellence, security, reliability, performance, cost, sustainability) turned into questions you ask of any design, with Brightpost's three-tier stack reviewed against them. Not a summary of any vendor framework.
- Sections: The problem: a design that "works" · The pillars as questions · Reviewing Brightpost's stack · Trade-offs between pillars · Making review a habit · What breaks · Try it · On AWS / Google Cloud / Azure · Common mistakes · Related · Interview questions
- Diagrams:
  1. animated single: reuse `animated/cloud/region-zone-edge` step={3} with a caption walking the reliability and cost questions over the same picture.
  2. mermaid inline: the review loop (design → ask pillar questions → record trade-offs → change → measure).
  3. widget `<ScenarioGrid>`: six cards, one per pillar, each "Brightpost problem → the question → the pick".
- Reuses: region-zone-edge spec; ScenarioGrid; {Well-Architected Tool | Architecture Framework | Advisor} as labels in tabs.
- Needs: none.
- Questions: 4 (1J/2M/1S): "What is a pillar, and why are there several?" · "Give one case where reliability and cost pull in opposite directions." · "Run a five-minute review of a single-zone app with a nightly backup."
- Exams: CLF D1 (Well-Architected pillars), SAA all domains (framing), PCA 1.x (Well-Architected Framework, trade-offs), AZ-900 management (Advisor), AZ-305 (design framing).
- Links: regions-zones-edge, /cloud/resilience/ha-patterns, /cloud/resilience/dr-strategies, /cloud/operations/slos-alerting-and-on-call, /system-design/fundamentals/non-functional-requirements.

#### 10. infrastructure-as-code — Infrastructure as Code (Intermediate, ~2,000 words)
- Scope: Why clicking in a console does not scale, what "declarative" means, how a tool keeps state and computes a plan, how modules make environments identical, and how to choose between Terraform and a provider's native engine.
- **Review addition:** first H2 "Ways to talk to a cloud": console, command line, browser shell, SDKs and local emulators, as concepts only, with no click-paths. (AZ-900 tools, PCA 5.2)
- Sections: The problem: the firewall rule nobody remembers · Declarative vs imperative · State: the tool's memory · Plan, review, apply · Modules: one definition, many environments · Terraform (and OpenTofu) vs native engines · Drift and how to catch it · What breaks · Try it · On AWS / Google Cloud / Azure · Common mistakes · Related · Interview questions
- Diagrams:
  1. animated stepper `animated/cloud/iac-pipeline`: step 1 "Clicked together in the console" · step 2 "Drift: a rule added by hand" (fails: staging and prod differ, red diff) · step 3 "Describe it in a template; the tool stores state" · step 4 "Plan in CI, review, apply" (git → runner → plan → approval → cloud API) · step 5 "One module, three environments" (module fans out to dev/stage/prod accounts) · step 6 "Native engine or Terraform" (alternative: same template routed through CloudFormation / Infrastructure Manager / Bicep).
  2. mermaid inline: declarative (desired state → diff → actions) vs imperative (script of actions) side by side.
  3. widget `<CloudDecisionTree topic="iac-tool">`: one cloud or several? team skills? state hosting? → Terraform/OpenTofu, native engine, or CDK-style code.
- Reuses: glyphs folder, file, log, server, shield; lucide git-branch, workflow; catalog aws-cloudformation, aws-cdk, gcp-infra-manager, azure-bicep, aws-codepipeline, gcp-cloud-build, azure-pipelines; capability id `iac`.
- Needs: decision tree `iac-tool`; optional glyph `pipeline` (plan names it), lucide `workflow` as fallback.
- Questions: 5 (1J/3M/1S): "What does declarative mean for infrastructure?" · "Why does the state file matter, and where should it live?" · "Brightpost's prod and staging drifted apart; how do you find and stop it?" · "Terraform or the native engine for a single-cloud team: how do you decide?" · "How do you make a change to a shared module safe for three environments?"
- Exams: CLF D1/D3 (IaC concept), SAP continuous improvement (CI/CD, Config/drift), ACE 3.x (Terraform, Config Connector), PCA 4.x/5.x (Terraform, SDLC), AZ-900 management (IaC, ARM templates), AZ-104 compute (ARM/Bicep interpret, modify, deploy).
- Links: landing-zones, accounts-and-governance, /cloud/operations/ci-cd-and-deployment-strategies, /cloud/operations/config-patching-and-fleet-management, /cloud/aws/devops, /cloud/gcp/devops, /cloud/azure/devops.

### Hub totals
- Pages: 10 (6 Intermediate, 4 Beginner); ~18,700 words.
- Diagrams: 29 — animated stepper 6 (one-server-to-elastic, region-zone-edge, responsibility-line, iam-role-chain, landing-zone, iac-pipeline), animated single 4 (service-model-ladder, resource-hierarchy, cost-levers, region-zone-edge reused at step 3), mermaid asset 1 (sts-assume-role), mermaid inline 10, widget 8 (ScenarioGrid ×3, ResponsibilityGrid ×2, CloudDecisionTree ×4 counting cost-model, DataModelView ×1; one ScenarioGrid shared count adjusted above), svg 0.
- Questions: 44 (10 Junior, 24 Mid, 10 Senior); identity-and-access carries 5 with diagram ids.
- New assets: animated/cloud/one-server-to-elastic, service-model-ladder, region-zone-edge, responsibility-line, iam-role-chain, resource-hierarchy, landing-zone, cost-levers, iac-pipeline (each with .meta.yaml, source: original, tags [cloud, fundamentals, <topic>]); mermaid/cloud/sts-assume-role.
- New glyphs: none required (key, shield, lock, folder, log, tree already exist); optional datacenter, policy, meter, pipeline.
- New decision trees: identity-type, account-structure, iac-tool; plus planned cost-model.
- New responsibility sets: shared-responsibility (planned).
- Catalog fields: `concept` href on aws-iam, gcp-iam, azure-entra-id, aws-cloudformation, gcp-infra-manager, azure-bicep.
- Shared-file touches: 10 ModelCards in content/cloud/fundamentals.mdx mirrored in _index.yaml; 10 rows in question-bank/articles.yaml under cloud-architecture/fundamentals; start-here/cloud-basics redirects or shrinks to a pointer once pages 3, 4 and 8 ship.
