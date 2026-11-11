## Hub: networking — Networking & APIs

> **Wave 0 status (2026-11-11).** The hub, its `_index.yaml` entry and every page below exist as `status: outline`
> stubs. `RECONCILIATION.md` wins over this brief wherever they disagree (components, page skeleton, answer style,
> what not to re-teach). Reserved diagram ids, owners and kinds: `ASSETS.md`. Terms use `<Term id>` from the one
> glossary, `content/system-design/glossary.yaml`; a page defines a term on first use and has no "Terms you need"
> section. Bullets that start with **Review addition** or **Reconciliation** were added in Wave 0.

This hub is for a learner who has finished Fundamentals and can say what a region, a zone and an account are, but has never drawn a network. It follows Brightpost (the running shop example) from one public VM to a private three-tier network that other networks, offices and partners can reach, then changes level: how clients and services actually talk (REST, GraphQL, gRPC, realtime transports, webhooks) and the gateway that sits in front of all of it. Read in order: Inside the network (1-3) → Connecting networks (4-6) → Reaching your services (7-9) → APIs (10-14). Pages 10-14 can be read standalone. **Reconciliation:** the protocols themselves (REST, GraphQL, gRPC, WebSockets, SSE, polling, webhooks) are written under `/system-design/fundamentals`; pages 10-13 recap the idea in one short paragraph with a link and teach what the managed services add. The review's extra page `networking/how-a-request-travels` is **dropped**: link to `/system-design/fundamentals/anatomy-of-a-request`.

### Categories
- **Inside the Network** → vpc-and-subnets, firewalls, nat-and-egress
- **Connecting Networks** → private-endpoints, connecting-networks, hybrid-connectivity
- **Reaching Your Services** → dns, load-balancing, cdn-edge-and-waf
- **APIs** → hosting-apis, service-to-service, realtime-on-the-cloud, webhooks-on-the-cloud, api-gateways

### Pages

#### 1. vpc-and-subnets — Private Networks, Subnets & Routing (Beginner, ~2200 words)
- Scope: Why Brightpost's one VM with a public IP is a problem, and how a private network with address ranges, subnets per tier and zone, route tables and an internet gateway fixes it. Flagship page; the stepper here is the picture every later page and case study reuses.
- **Review addition:** this is the hub's first page, so it embeds `cloud/brightpost-grows` at the step that matches the hub (step 3, two app servers in two zones) before its own diagrams. The spec is owned by `start-here/cloud-in-10-minutes`.
- Sections: The problem with one public VM · What a private network is (address block, CIDR in plain words) · Subnets: public, app, data · Spreading across three zones · Routes decide where packets go · Build it step by step · What breaks · Try it · On AWS / Google Cloud / Azure (GCP VPC is global with regional subnets; AWS/Azure networks are regional, Azure subnets span zones) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/vpc-three-tier` (FLAGSHIP, reusable with `step={n}` by case studies). Zones: kind=region → kind=vpc → 9 kind=subnet (public/app/data × AZ a/b/c). Steps: (1) One VM, public IP: users→server, everything exposed. (2) Draw the network boundary: vpc zone + CIDR, server moves inside. (3) Split into subnets: public (load-balancer), app (server teal), data (database violet); route table note "only public has a route to the internet gateway". (4) Three zones: tiers duplicated in AZ b and c; LB fans out. (5) Outbound path: NAT in public subnet, app→NAT→internet dashed (hands off to page 3). (6) Private endpoint for object storage: app→blob via endpoint, not NAT (hands off to page 4). (7) FAILURE: AZ a greyed out; LB routes to b and c; database fails over; caption: "this is what three zones buy you". Nodes carry cloud ids `aws-vpc`/`gcp-vpc`/`azure-vnet`, `aws-elb`/`gcp-cloud-load-balancing`/`azure-app-gateway`, `{NAT gateway}`/`{Cloud NAT}`/`{NAT Gateway}`, `aws-privatelink`/`gcp-psc`/`azure-private-link`.
  2. mermaid inline: a route table as a lookup ("destination 10.0.0.0/16 → local; 0.0.0.0/0 → internet gateway") drawn as a simple flow.
  3. widget `<ConceptMap spec="animated/cloud/vpc-three-tier"/>` mapping table under the stepper.
- Reuses: existing three-tier mermaid in aws/networking (replaced by the spec), `<CloudGroupTable group="networking">`, glyphs server/load-balancer/database/blob/users, zone kinds region/vpc/subnet.
- Needs: glyph `nat`, glyph `router` (route table); `<ConceptMap>` component (planned).
- Questions: 6 (1J/3M/2S). "Why do databases never get a public IP?" · "Design Brightpost's subnets so losing one zone is invisible to users" (diagram #step=7) · "GCP has one global VPC; what does that remove from the AWS design, and what does it not remove?"
- Exams: CLF D3; SAA 1.2, 3.4; ACE 3 (custom/shared VPC), ACE 4 (subnet expansion); PCA 1 (cloud-native networking, Shared VPC); AZ-900 architecture (VNets/subnets); AZ-104 networking; AZ-305 infrastructure.
- Links: /cloud/fundamentals/regions-zones-edge, /cloud/networking/firewalls, nat-and-egress, private-endpoints, /cloud/aws/networking, /cloud/gcp/networking, /cloud/azure/networking, /system-design/fundamentals/networking.

#### 2. firewalls — Firewalls: Security Groups, NACLs, NSGs & Firewall Policies (Beginner, ~1800 words)
- Scope: The two places a packet can be checked (on the resource, at the subnet or network edge), stateful vs stateless in plain words, and the one habit that matters: allow by identity (group/tag/service account), not by IP.
- Sections: Who may talk to whom · Stateful vs stateless (the doorman who remembers you) · Rules on the resource vs rules on the subnet · Referencing groups and tags instead of addresses · Hierarchical and managed firewalls · What breaks · Try it · On AWS / Google Cloud / Azure (AWS: SG + NACL; GCP: VPC firewall rules/policies by tag or service account, hierarchical at folder/org; Azure: NSG + ASG, Azure Firewall) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/firewall-layers` (reuses vpc-three-tier layout, 1 AZ). Steps: (1) LB→app→db with no rules: everything reachable. (2) Resource rules: LB allows 443 from internet; app allows app port from "LB group"; db allows 5432 from "app group". (3) Return traffic: stateful means no reverse rule (packet animates back). (4) Subnet/stateless layer added as a broad deny band. (5) FAILURE: someone opens 5432 to 0.0.0.0/0 on the db; red packet from internet reaches db; caption "the rule you forget to remove".
  2. mermaid asset `mermaid/cloud/firewall-evaluation` sequence: packet → subnet rules → resource rules → return path, stateful vs stateless side by side.
  3. widget `<ResponsibilityGrid set="network-security">` (who manages what in resource vs managed firewall).
- Reuses: `resource-firewall`, `managed-firewall` capability ids; glyphs shield, lock, server, database.
- Needs: glyph `firewall`; responsibility set `network-security`.
- Questions: 5 (1J/3M/1S). "Stateful vs stateless firewall, in one sentence each" · "Why reference a security group instead of a CIDR?" · "Design org-wide guardrails that no team can bypass on GCP and Azure."
- Exams: SAA 1.2; CLF D2; ACE 3 (firewall rules by tags/service accounts); PCA 3 (hierarchical firewalls); AZ-900 (NSG), AZ-104 (NSG/ASG, effective rules); AZ-305 network security.
- Links: vpc-and-subnets, /cloud/fundamentals/identity-and-access, /cloud/resilience/zero-trust, /system-design/fundamentals/security.

#### 3. nat-and-egress — NAT & Leaving the Network (Beginner, ~1500 words)
- Scope: How a server without a public IP still reaches the internet, why NAT is a per-zone and per-GB cost, and when an endpoint is the cheaper answer.
- Sections: Private servers still need updates · What NAT does (one shared return address) · Where NAT sits and why one per zone · The egress bill · Alternatives: endpoints, pull-through caches, egress-only IPv6 · What breaks · Try it · On AWS / Google Cloud / Azure (AWS zonal vs regional NAT gateway; GCP Cloud NAT is regional and managed via Cloud Router; Azure NAT Gateway is zonal and attaches to subnets) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/nat-egress`. Steps: (1) app server, no route out; packet dies. (2) NAT in public subnet, packets rewritten, reply flows back. (3) One NAT per zone. (4) FAILURE: single NAT's zone fails, other zones lose outbound. (5) Endpoint added: object-storage traffic bypasses NAT (cost arrow shrinks).
  2. mermaid inline: cost flow "GB through NAT vs GB through endpoint" as a decision flow (no prices).
- Reuses: `nat` capability id; vpc-three-tier step 5 cross-reference; glyphs globe, blob.
- Needs: glyph `nat` (shared with page 1).
- Questions: 4 (1J/2M/1S). "Why does a private server need NAT at all?" · "Your NAT bill tripled; list what you check" · "Design egress for 200 microservices with per-team attribution."
- Exams: SAA 1.2, 4.x (NAT costs, data-transfer paths); ACE 4 (Cloud NAT); AZ-104 networking.
- Links: vpc-and-subnets, private-endpoints, /cloud/operations/cloud-cost-models, /cloud/aws/networking.

#### 4. private-endpoints — Private Endpoints: PrivateLink, Private Service Connect & Private Link (Intermediate, ~1800 words)
- Scope: Reaching a managed service, or another team's service, through a private IP inside your own network instead of over the public internet; the producer/consumer model and why it beats peering for one service.
- Sections: The managed service lives outside your network · Two kinds: provider endpoints and your own services · Consumer and producer sides · Endpoint vs peering vs NAT · DNS is half the job · What breaks · Try it · On AWS / Google Cloud / Azure (AWS gateway vs interface endpoints; GCP PSC endpoints/backends and Private Google Access; Azure service endpoints vs private endpoints) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/private-endpoint`. Steps: (1) app→NAT→internet→managed service (public path). (2) Endpoint appears in app subnet; path goes private. (3) Producer side: partner VPC exposes a service behind an internal LB; consumer gets endpoint. (4) DNS: private zone answers the service name with the endpoint IP. (5) FAILURE/ALT: without the private DNS record, clients still go public; caption "the endpoint nobody used".
  2. mermaid inline: comparison flow peering vs endpoint vs NAT.
- Reuses: `aws-privatelink`, `gcp-psc`, `azure-private-link`, `private-endpoints`; vpc-three-tier step 6; glyphs link, blob, load-balancer.
- Needs: none beyond page-1 glyphs.
- Questions: 5 (1J/3M/1S). "Gateway endpoint vs interface endpoint?" · "Expose Brightpost's payments service to a partner account without peering" · "Why can a service endpoint (Azure) still leak traffic that a private endpoint cannot?"
- Exams: SAA 1.2, 3.4, 4.x; PCA 1 (Private Service Connect); AZ-900/AZ-104 (service vs private endpoints); AZ-305.
- Links: vpc-and-subnets, nat-and-egress, dns, connecting-networks, /cloud/data/object-storage.

#### 5. connecting-networks — Peering, Hub-and-Spoke & Transit (Intermediate, ~1900 words)
- Scope: What to do when Brightpost has five networks (prod, staging, shared tools, data, partner): direct peering and its non-transitive trap, then a hub that routes between all spokes and on-prem.
- Sections: One network stops scaling · Peering: a private cable between two networks · Why peering is not transitive (the mesh problem) · Hub-and-spoke with a managed transit hub · Shared/central networks as the alternative · Route tables in the hub · What breaks · Try it · On AWS / Google Cloud / Azure (AWS Transit Gateway/Cloud WAN; GCP's global VPC + Shared VPC + Network Connectivity Center; Azure VNet peering + Virtual WAN) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/hub-spoke`. Steps: (1) two VPCs peered. (2) third VPC: peering lines multiply (mesh). (3) FAILURE: A↔B and B↔C peered, A tries to reach C through B, packet dropped. (4) Transit hub replaces mesh; spokes attach. (5) On-prem attaches to the hub (hands off to page 6). (6) ALT: GCP Shared VPC — one network, many projects.
  2. widget `<CloudDecisionTree topic="connectivity">` (peering vs hub vs endpoint vs shared network).
- Reuses: `aws-transit-gateway`, `peering`, `hub-spoke`; glyphs coordinator (hub), server.
- Needs: decision tree `connectivity` (planned); glyph `router`.
- Questions: 5 (1J/2M/2S). "Why is peering non-transitive?" · "Overlapping CIDRs between two teams; options?" · "Design a shared network account for 40 teams with inspection in the hub."
- Exams: SAA 3.4, 4.x (TGW vs peering); SAP organizational complexity (transitive routing, multi-VPC); ACE 3 (shared VPC, peering); PCA 1-2 (hybrid topologies); AZ-900 (peering), AZ-104, AZ-305.
- Links: vpc-and-subnets, private-endpoints, hybrid-connectivity, /cloud/fundamentals/accounts-and-governance.

#### 6. hybrid-connectivity — VPN, Direct Connect, Interconnect & ExpressRoute (Intermediate, ~1700 words)
- Scope: Joining an office or data centre to the cloud: encrypted tunnels over the internet first, a dedicated line when bandwidth or predictability matter, and why you keep the VPN as the backup.
- Sections: Brightpost's warehouse needs the private database · Site-to-site VPN · Dedicated links · Bandwidth, latency, cost and lead time · Redundancy (two links, VPN as backup) · Hybrid DNS · What breaks · Try it · On AWS / Google Cloud / Azure (Direct Connect + Site-to-Site VPN; Interconnect dedicated/partner + Cloud VPN HA; ExpressRoute + VPN Gateway) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/hybrid-link`. Steps: (1) office→internet→cloud, public path. (2) VPN tunnel (dashed lock). (3) Dedicated link beside it, traffic moves over. (4) FAILURE: dedicated link cut; routes fail back to VPN; caption "slower, not down". (5) Hybrid DNS resolver forwards private names both ways.
  2. mermaid inline: BGP route preference as a simple "which path wins" flow.
- Reuses: `aws-direct-connect`, `gcp-interconnect`, `azure-expressroute`, `vpn`, `dedicated-link`; glyphs lock, globe.
- Needs: glyph `tunnel` (VPN), glyph `building` (on-prem/office).
- Questions: 4 (1J/2M/1S). "VPN or dedicated link for a 10-person office?" · "Dedicated link is live but traffic still uses the internet; why?" · "Design hybrid DNS so on-prem resolves private cloud names and vice versa."
- Exams: SAA 1.2, 3.4, 4.x (DX vs VPN cost); SAP (hybrid DNS); ACE 3 (Cloud VPN); PCA 2 (hybrid/multicloud); AZ-900 (VPN Gateway, ExpressRoute); AZ-305 on-prem connectivity.
- Links: connecting-networks, dns, /cloud/operations/migration-and-modernization, /cloud/resilience/dr-strategies.

#### 7. dns — DNS on the Cloud: Public Zones, Private Zones & Routing Policies (Beginner, ~1600 words)
- Scope: Names to addresses, the difference between a zone the internet can see and one only your network can see, and how DNS answers become a traffic-steering tool (weighted, latency, geo, failover).
- Sections: Nobody types an IP · How a lookup travels (recursive resolver, authoritative zone, TTL) · Public zones · Private zones inside your network · Routing policies: weighted, latency, geo, failover · Health checks and the TTL trap · What breaks · Try it · On AWS / Google Cloud / Azure (Route 53 has routing policies built in; Cloud DNS has routing policies, Azure splits them into Azure DNS + Traffic Manager) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/dns-resolution`. Steps: (1) phone asks resolver → authoritative zone → IP → LB. (2) Private zone: app asks for `db.internal` and gets a private IP. (3) Routing policy: two regions, latency answer. (4) FAILURE: region A unhealthy, failover record flips; clients with long TTL keep hitting A for minutes.
  2. mermaid asset `mermaid/cloud/dns-lookup` sequence (browser, resolver, root/TLD/authoritative, TTL).
- Reuses: `aws-route53`, `gcp-cloud-dns`, `azure-dns`, `azure-traffic-manager`, `dns`, `dns-steering`; glyphs dns, phone, globe.
- Needs: none.
- Questions: 5 (1J/3M/1S). "Public vs private zone?" · "Failover DNS still sent traffic to the dead region for 10 minutes; why?" · "Latency routing vs a global anycast load balancer: when each?"
- Exams: CLF D3; SAA 2.2, 3.4; SAP (DNS routing policies, Route 53 Resolver); Digital Leader network terms; ACE 4 (Cloud DNS); AZ-900 (Azure DNS), AZ-104.
- Links: load-balancing, cdn-edge-and-waf, hybrid-connectivity, /cloud/resilience/multi-region, /cloud/aws/edge, /cloud/gcp/edge, /cloud/azure/edge.

#### 8. load-balancing — Load Balancing: L4 vs L7, Regional vs Global (Beginner, ~2000 words)
- Scope: One address in front of many servers; what a balancer can see at layer 4 (addresses and ports) versus layer 7 (HTTP), and why Google and Azure offer a single global front door while AWS pairs regional balancers with DNS or an accelerator. Pattern theory stays in /system-design/patterns/load-balancing.
- Sections: One server, then two · What the balancer sees: L4 vs L7 · Health checks and draining · TLS termination · Internal balancers between tiers · Regional vs global entry points · Cross-zone traffic and cost · What breaks · Try it · On AWS / Google Cloud / Azure (ALB/NLB/GWLB + Global Accelerator; one global external Application LB with anycast IP; Load Balancer L4, Application Gateway L7, Front Door global) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/lb-l4-vs-l7`. Steps: (1) client→one server. (2) L4 balancer: packets split by connection. (3) L7 balancer: path `/api` to app, `/images` to blob; header shown. (4) Internal LB between app and workers. (5) FAILURE: one server fails health check; traffic drains; caption. (6) ALT: global anycast front door spanning two regions.
  2. widget `<CloudDecisionTree topic="load-balancer">`.
  3. mermaid inline: TLS termination at LB vs pass-through (asset `mermaid/cloud/tls-at-lb` if reused by security hub).
- Reuses: `aws-elb`, `gcp-cloud-load-balancing`, `azure-load-balancer`, `azure-app-gateway`, `azure-front-door`, `aws-global-accelerator`, `l4-lb`, `l7-lb`, `anycast-entry`; glyphs load-balancer, server, globe; the ALB/NLB table from aws/networking.
- Needs: decision tree `load-balancer` (planned).
- Questions: 6 (1J/3M/2S). "L4 or L7 for a WebSocket chat tier?" · "Where does TLS end, and what does that change for the app?" · "Design a two-region entry point on AWS and on GCP; what differs?"
- Exams: CLF D3; SAA 2.1, 3.4; ACE 2 (load balancing, Network Service Tiers); PCA 1; AZ-900, AZ-104 (internal/public LB); AZ-305 load balancing and routing.
- Links: /system-design/patterns/load-balancing, dns, cdn-edge-and-waf, realtime-on-the-cloud, /cloud/compute/autoscaling, /cloud/resilience/ha-patterns.

#### 9. cdn-edge-and-waf — CDN, Edge, DDoS & WAF (Intermediate, ~1800 words)
- Scope: Moving static content and the first line of defence to the provider's edge: how a cache miss travels, what an edge function can change, and the difference between absorbing a flood (DDoS) and inspecting a request (WAF). Caching theory links to /system-design/patterns/caching.
- Sections: Brightpost's product images are slow in Sydney · What the edge is · A request through the CDN (hit, miss, origin shield) · Cache keys, TTL and invalidation · Edge compute · DDoS absorption vs WAF rules · Rate limiting at the edge · What breaks · Try it · On AWS / Google Cloud / Azure (CloudFront + Shield + WAF; Cloud CDN/Media CDN + Cloud Armor; Front Door with built-in WAF) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/cdn-request-path`. Steps: (1) phone→origin direct, far away. (2) Edge PoP added; miss travels to origin and is stored. (3) Second user: hit. (4) WAF rule band at edge blocks a bad request (red). (5) FAILURE: cache stampede on expiry; origin shield absorbs. 
  2. mermaid inline: cache-key anatomy (host, path, query, headers).
- Reuses: `aws-cloudfront`, `gcp-cloud-cdn`, `azure-front-door`, `aws-waf`, `aws-shield`, `gcp-cloud-armor`, `azure-waf`, `cdn`, `waf`, `ddos`, `edge-compute`; glyphs cdn, shield, phone, blob.
- Needs: none.
- Questions: 5 (1J/2M/2S). "Hit, miss, origin shield: explain the path" · "A WAF rule blocked legitimate checkout traffic; how do you roll out rules safely?" · "Static site plus API behind one CDN: what do you cache and what do you never cache?"
- Exams: CLF D2-D3; SAA 1.2, 2.1, 3.4; Digital Leader (Cloud Armor/DDoS); PCA 1; AZ-900 (Front Door, DDoS); AZ-305.
- Links: /system-design/patterns/caching, /system-design/patterns/rate-limiting, load-balancing, dns, /cloud/data/object-storage, /cloud/resilience/zero-trust.

#### 10. hosting-apis — Hosting REST and GraphQL APIs (Beginner, ~2000 words)
- Scope: How a client asks a server for things over HTTP: resources, verbs, status codes, pagination and versioning in REST; one typed schema and client-shaped queries in GraphQL; when each fits and how both run on the cloud.
- **Reconciliation (wins over the bullets below):** was `rest-and-graphql` — "REST & GraphQL". New scope: where an API runs and what sits in front of it on each cloud (gateway vs load balancer, managed GraphQL, auth, throttling, custom domains, cold paths). Theory lives at `/system-design/fundamentals/rest`, `graphql`, `choosing-an-api-style`; recap it in at most one short paragraph with a link, then teach limits, options, per-cloud differences, cost shape and failure behaviour. Diagram id `rest-vs-graphql` becomes `api-hosting-paths`; redraw its steps around the hosting paths, not the protocol comparison.
- Sections: Brightpost's app needs orders and products · HTTP in one minute · REST: resources, verbs, status codes, idempotency · Pagination, filtering, versioning · GraphQL: schema, query, mutation, resolver · Over- and under-fetching · Choosing between them · Running them on the cloud (gateway, managed GraphQL, caching) · What breaks · Try it · On AWS / Google Cloud / Azure (API Gateway + AppSync; Apigee/Cloud Run; API Management; GraphQL is self-hosted on GCP/Azure) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/rest-vs-graphql`. Steps: (1) REST: phone→`GET /orders/42`→server→database, response. (2) Three screens need three calls (over-fetch bars). (3) GraphQL: one query, resolvers fan to two services. (4) FAILURE: an unbounded GraphQL query hits every table; depth/cost limiter blocks it.
  2. mermaid inline: REST verb → status code table as flow.
  3. widget `<ScenarioGrid>` (mobile feed, admin CRUD, public partner API → REST or GraphQL).
- Reuses: `aws-api-gateway`, `aws-appsync`, `graphql`, `api-front-door`; glyphs api, browser, phone, server, database.
- Needs: decision tree `api-protocol` (new: REST/GraphQL/gRPC/WebSocket/SSE/webhook); fills the outline stubs at /system-design/fundamentals/rest and /graphql by link.
- Questions: 6 (1J/3M/2S). "PUT vs PATCH vs POST, and which is idempotent?" · "Version a public REST API without breaking old mobile apps" · "GraphQL in front of 12 microservices: where does N+1 come from and how do you stop it?"
- Exams: SAA 2.1 (API Gateway/REST); Digital Leader (APIs, Apigee); PCA 5 (API management); AZ-305 API integration.
- Links: api-gateways, service-to-service, realtime-on-the-cloud, /system-design/fundamentals/rest, /system-design/fundamentals/graphql, /system-design/patterns/idempotency, /system-design/patterns/caching.

#### 11. service-to-service — Service-to-Service Calls on the Cloud (Intermediate, ~1600 words)
- Scope: Why services talking to services prefer a typed contract and a binary wire format: protocol buffers, HTTP/2 streams, generated clients, deadlines, and the two cloud gotchas (load balancers and browsers).
- **Reconciliation (wins over the bullets below):** was `grpc` — "gRPC & Service-to-Service Calls". New scope: gRPC and HTTP/2 through managed load balancers, service discovery and private DNS, service mesh, mTLS, workload identity between services. Theory lives at `/system-design/fundamentals/rpc`; recap it in at most one short paragraph with a link, then teach limits, options, per-cloud differences, cost shape and failure behaviour. Diagram ids `grpc-call` and `grpc-deadline` stay (`grpc-deadline` is a `sequence` spec).
- Sections: Brightpost's checkout calls inventory 50 times a second · RPC: call a function on another machine · The contract: .proto and generated code · Four call types (unary, server/client/bidirectional streaming) · Deadlines, retries, status codes · gRPC through cloud load balancers (HTTP/2, L7 awareness) · gRPC-Web and browsers · What breaks · Try it · On AWS / Google Cloud / Azure (ALB and Cloud Run support gRPC natively; API Gateway needs HTTP proxying; Application Gateway v2 HTTP/2 limits) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/grpc-call`. Steps: (1) REST JSON between two services, big payload bar. (2) gRPC: binary packets, smaller; shared contract shown. (3) Server streaming: many packets on one connection. (4) FAILURE: L4 balancer pins all streams to one backend (hot server); L7 balancer rebalances.
  2. mermaid asset `mermaid/cloud/grpc-deadline` sequence: deadline propagates through three hops.
- Reuses: `aws-elb`, `gcp-cloud-load-balancing`, `azure-app-gateway`, `aws-vpc-lattice`, `service-networking`; glyphs api, server, workers.
- Needs: none (uses `api-protocol` tree from page 10).
- Questions: 5 (1J/3M/1S). "What does a .proto give you that OpenAPI does not?" · "Why does gRPC behind an L4 balancer load unevenly?" · "Design deadlines and retries for a 4-hop checkout call chain."
- Exams: SAA 2.1 (microservices, ALB gRPC); PCA 1 (integration patterns); AZ-305.
- Links: hosting-apis, load-balancing, /system-design/fundamentals/rpc, /system-design/patterns/circuit-breaker-and-retries, /cloud/compute/kubernetes-concepts.

#### 12. realtime-on-the-cloud — Real-Time Connections on the Cloud (Intermediate, ~2100 words)
- Scope: Getting data to the client when the server has something new: short polling, long polling, server-sent events and WebSockets, compared on cost, direction and infrastructure, plus how managed connection services take the fleet problem away.
- **Reconciliation (wins over the bullets below):** was `realtime-protocols` — "WebSockets, SSE & Polling". New scope: managed WebSocket and pub/sub services, idle timeouts on load balancers and CDNs, connection limits, scaling long-lived connections. Theory lives at `/system-design/fundamentals/websockets`, `server-sent-events`, `long-polling`, `ajax-polling`, `choosing-realtime`, `push-notifications`; recap it in at most one short paragraph with a link, then teach limits, options, per-cloud differences, cost shape and failure behaviour. Diagram ids `realtime-transports` and `managed-websockets` stay.
- Sections: Brightpost wants live order status · Short polling: ask again and again · Long polling: hold the question · SSE: one open stream, server to client · WebSockets: both directions · Choosing a transport · Scaling connections on the cloud (sticky connections, L4 vs L7, managed WebSocket services, pub/sub fan-out) · What breaks · Try it · On AWS / Google Cloud / Azure (API Gateway WebSocket APIs + AppSync; no managed WebSocket service, use Cloud Run with session affinity or Firebase; Web PubSub/SignalR) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/realtime-transports`. Steps: (1) short polling: phone asks every 5 s, mostly empty replies. (2) long polling: request held, answered on event. (3) SSE: one stream, server pushes. (4) WebSocket: packets both ways. (5) FAILURE: deploy restarts the server; 100k WebSockets reconnect at once (thundering herd), jittered backoff shown.
  2. animated single `animated/cloud/managed-websockets` : clients→managed connection service→your function by connection id; pub/sub behind.
  3. widget `<DataModelView>` tabs comparing the four transports (latency, cost, direction, proxies/CDN support).
- Reuses: `managed-websockets`, `aws-appsync`, `azure-web-pubsub`, `l4-lb`; glyphs chat, presence, phone, bell, queue.
- Needs: none.
- Questions: 6 (1J/3M/2S). "SSE or WebSockets for a one-way live dashboard?" · "Why do CDNs and L7 proxies break long polling and SSE in surprising ways?" · "Design live order tracking for 1M concurrent users on the cloud of your choice."
- Exams: SAA 2.1 (API Gateway WebSocket, loosely coupled); AZ-305 messaging/event-driven.
- Links: load-balancing, api-gateways, /system-design/fundamentals/websockets, /system-design/fundamentals/server-sent-events, /system-design/fundamentals/long-polling, /system-design/fundamentals/ajax-polling, /cloud/data/streaming-and-messaging-services, /system-design/case-studies/facebook-messenger.

#### 13. webhooks-on-the-cloud — Receiving and Sending Webhooks on the Cloud (Intermediate, ~1600 words)
- Scope: The reverse of an API call: a provider POSTs to your URL when something happens. Delivery, retries, signatures, idempotency and the receiver design that never loses an event.
- **Reconciliation (wins over the bullets below):** was `webhooks` — "Webhooks: Calling the Client Back". New scope: gateway → queue → worker, signature secrets in a secret store, retries and dead-letter queues, managed event destinations. Theory lives at `/system-design/fundamentals/webhooks`; recap it in at most one short paragraph with a link, then teach limits, options, per-cloud differences, cost shape and failure behaviour. Diagram ids `webhook-receiver` and `webhook-retry` stay (`webhook-retry` is a `sequence` spec).
- Sections: Brightpost's payment provider needs to tell us "paid" · Webhook vs polling vs stream · Anatomy of a delivery · Verifying the sender (signatures, timestamps) · Retries, ordering, duplicates · The receiver: accept fast, process later · Being a webhook provider · What breaks · Try it · On AWS / Google Cloud / Azure (API Gateway → SQS → Lambda; Cloud Run → Pub/Sub; Functions → Service Bus/Event Grid; Event Grid/EventBridge as webhook senders) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/webhook-receiver`. Steps: (1) provider POSTs to app directly; app does work inline. (2) FAILURE: app slow → provider times out and retries → duplicate charge recorded. (3) Signature check at the edge. (4) Queue in the middle: ack in milliseconds, worker processes. (5) Idempotency key store dedupes retries.
  2. mermaid asset `mermaid/cloud/webhook-retry` sequence: attempts with backoff, 2xx vs 5xx.
- Reuses: `aws-api-gateway`, `aws-eventbridge`, `gcp-eventarc`, `azure-event-grid`, `event-bus`; glyphs bell, queue, workers, key, card.
- Needs: glyph `webhook`.
- Questions: 5 (1J/3M/1S). "Webhook or polling for payment status?" · "Why must a webhook receiver be idempotent?" · "Design webhook delivery as a provider for 10k customers with dead-letter handling."
- Exams: SAA 2.1 (event-driven, queues, EventBridge); SAP (EventBridge); AZ-305 event-driven/API integration.
- Links: hosting-apis, api-gateways, /system-design/fundamentals/webhooks, /system-design/patterns/idempotency, /system-design/patterns/message-queues, /cloud/data/streaming-and-messaging-services, /cloud/compute/serverless-functions.

#### 14. api-gateways — API Gateways & API Management (Intermediate, ~2000 words)
- Scope: The one door in front of all your APIs: routing, authentication, keys and quotas, throttling, versioning, transformation and developer portals; gateway vs load balancer vs service mesh, and when the extra hop is worth it.
- Sections: Twelve services, one URL · Gateway vs load balancer · What a gateway does on every request (auth, throttle, route, transform, log) · Keys, plans and quotas · Versioning and canary routes · API management: catalog, portal, analytics, monetisation · Gateways for serverless · Gateway vs service mesh for internal calls · What breaks · Try it · On AWS / Google Cloud / Azure (API Gateway REST/HTTP/WebSocket APIs; Apigee vs API Gateway vs Cloud Endpoints; API Management tiers and self-hosted gateway) · Common mistakes · Related.
- Diagrams:
  1. animated stepper `animated/cloud/api-gateway-request`. Steps: (1) phone→three services directly, three auth copies. (2) Gateway in front; one auth (key glyph). (3) Throttle: burst of packets, excess rejected (red). (4) Route `/v2` to canary service, 10% weight. (5) FAILURE: gateway misconfigured as single regional point; region fails; multi-region gateway + DNS failover.
  2. mermaid asset `mermaid/cloud/gateway-vs-lb` : layered flow CDN → WAF → L7 LB → gateway → service, what each layer owns.
  3. widget `<ScenarioGrid>` (public partner API, mobile BFF, internal east-west → gateway/management/mesh/plain LB).
- Reuses: `aws-api-gateway`, `gcp-apigee`, `azure-apim`, `api-front-door`, `aws-vpc-lattice`; glyphs gateway, key, timer, api.
- Needs: none.
- Questions: 6 (1J/3M/2S). "Gateway or load balancer?" · "Enforce per-customer quotas without touching service code" · "Public API for 500 partners with versioning, keys, monetisation and a developer portal: design and pick a service on each cloud."
- Exams: SAA 2.1 (API Gateway); Digital Leader (Apigee); PCA 5 (Apigee API management); AZ-305 API integration; cross-exam theme 16.
- Links: hosting-apis, service-to-service, realtime-on-the-cloud, webhooks-on-the-cloud, load-balancing, cdn-edge-and-waf, /system-design/patterns/rate-limiting, /cloud/compute/serverless-functions, /cloud/fundamentals/identity-and-access.

### Hub totals
- Pages: 14 (Beginner 6, Intermediate 8). `how-a-request-travels` is not built (dropped in reconciliation).
- Words: ~25,600.
- Diagrams: 14 animated steppers, 1 animated single, 6 mermaid assets, 9 mermaid inline, 0 svg, 8 widgets (2 ConceptMap/ResponsibilityGrid, 2 CloudDecisionTree, 2 ScenarioGrid, 1 DataModelView, plus CloudGroupTable where provider detail is needed). Total 38.
- Questions: 73 (J 14 / M 39 / S 20); all with `diagram=` ids.
- New assets: `animated/cloud/vpc-three-tier` (flagship), `firewall-layers`, `nat-egress`, `private-endpoint`, `hub-spoke`, `hybrid-link`, `dns-resolution`, `lb-l4-vs-l7`, `cdn-request-path`, `api-hosting-paths` (was `rest-vs-graphql`), `grpc-call`, `realtime-transports`, `managed-websockets`, `webhook-receiver`, `api-gateway-request`; mermaid `cloud/firewall-evaluation`, `cloud/dns-lookup`, `cloud/tls-at-lb`, `cloud/grpc-deadline`, `cloud/webhook-retry`, `cloud/gateway-vs-lb`.
- New glyphs: `firewall`, `router`, `nat`, `tunnel`, `building`, `webhook` (dns, lock, key, shield, globe, link, api, browser, coordinator already exist). Decision trees: `connectivity`, `load-balancer` (planned), `api-protocol` (new). Responsibility sets: `network-security` (new). Components: `<ConceptMap>`, `<CloudTabs>`, `InterviewQuestion diagram=` (planned, used throughout). Catalog: add `concept` href on the 23 networking/cdn-edge-and-waf/serverless/security services referenced above; no new catalog services required (NAT gateways stay `{label}` nodes).
