# Reconciliation with `development` (2026-11-11)

The plan in `README.md` and the hub briefs `00`–`07` were written on 2026-11-09. Since then the system-design
curriculum and a shared teaching toolkit were merged into `development`. **Where this file and a brief disagree,
this file wins.** Authoring references that now exist and must be followed:

- `apps/web/content/system-design/COMPONENTS.md` — every MDX component, the three diagram spec kinds, glyphs,
  interview-question rules.
- `apps/web/content/system-design/PAGE-TEMPLATES.md` — beginner-first rules, originality policy, concept-page skeleton,
  `<PremiumBreak />` placement, "at most two widgets per page".

## 1. Components: reuse, do not build

| Brief says | Use instead (already on `development`) |
|---|---|
| `<CloudTabs>` / `<CloudTab>` | `<Tabs title="On each cloud"><Tab label="AWS">…</Tab><Tab label="Google Cloud">…</Tab><Tab label="Azure">…</Tab></Tabs>` |
| `<Term>` + `content/cloud/_glossary.yaml` + a cloud glossary page | The site has **one** glossary: `content/system-design/glossary.yaml`, page `/system-design/glossary`, tag `<Term id="…">`. Cloud terms are added to that file (Wave 0 seeds them). No cloud glossary page. |
| `<ConceptMap spec lead>` | `<CloudMapping diagram="cloud/<name>" lead="aws" />` already works for any architecture spec whose nodes have `cloud:`. |
| `InterviewQuestion diagram="…"` attribute and the library "see diagram" link | Not needed. Answers are full MDX in the article **and** the library, and may contain `<AnimatedDiagram>` (with `highlight`/`path`/`step`), `<Callout>`, `<KeyIdea>`, `<Compare>`, `<Tabs>`. See COMPONENTS.md §5. |
| Answer house style "bold decision, bullets, Trade-off, Follow-up" | The site style: **Short answer.** → **Why.** → diagram (optional, at most one, reuse the page's spec) → **Follow-ups the interviewer may ask.** → **Watch out for.** |
| Inline "try it" decision trees via catalog `DECISION_TREES` | Prefer `<DecisionTree title tree={{…}} />` inline in the page (generic yes/no tree). Use `<CloudDecisionTree topic>` only when the result must list a service per provider (topics: `compute`, `messaging`, plus the five added in Wave 1b). |
| `<ScenarioGrid>` self-checks | Still available; `<Quiz>/<QuizItem>` is the lighter self-check. |
| Mermaid assets for sequences; SVG assets | Use spec kinds: `sequence` (lanes and messages) and `layout` (static drawing) under `assets/diagrams/animated/cloud/`. Mermaid only for tiny decision flows. |
| "Common mistakes", "What breaks" boxes | Follow the concept skeleton below; "What breaks" is the failure step of the stepper plus a `<Callout tone="red">`. |

Also available and encouraged: `<KeyIdea>`, `<Compare>`, `<ProsCons>`, `<Numbers>`, `<Quiz>`, `<NinesCalculator>`,
`<LatencyLadder>`, `<LoadBalancerSim>`, `<CacheSim>`, `<RateLimiterSim>`, `<ReplicationLagDemo>`, `<QuorumPicker>`
(at most two lazy widgets per page, counting `DecisionTree`).

## 2. Cloud concept page skeleton (H2 order)

In one sentence (`<KeyIdea>`) → The story (Brightpost) → How it works (steps, each with the page's stepper at
`step={n}`; `<PremiumBreak />` after step 1) → On AWS, Google Cloud and Azure (`<Tabs>` + `<CloudMapping>`; the one
difference per cloud that changes a design) → Try it → Trade-offs → Common pitfalls → How to say it in an interview →
Interview questions → Related → Further reading. The pilot page settles the details; it then becomes
`content/cloud/PAGE-TEMPLATES.md`.

## 3. Do not re-teach what system-design already teaches

These pages are **written** on `development`. A cloud page recaps the idea in at most one short paragraph with a
link, then teaches what the managed services add (limits, options, per-cloud differences, cost shape, failure
behaviour).

| Theory lives at | Cloud page that links to it |
|---|---|
| `/system-design/fundamentals/anatomy-of-a-request`, `http`, `tcp-udp`, `tls`, `networking` | all of `networking/*` |
| `/system-design/fundamentals/dns` | `networking/dns` |
| `/system-design/fundamentals/load-balancing-basics`, `/system-design/patterns/load-balancing` | `networking/load-balancing` |
| `/system-design/fundamentals/cdn`, `proxies` | `networking/cdn-edge-and-waf` |
| `/system-design/fundamentals/api-gateway`, `api-design`, `api-auth` | `networking/api-gateways` |
| `/system-design/fundamentals/rest`, `graphql`, `rpc`, `choosing-an-api-style` | `networking/hosting-apis`, `networking/service-to-service` |
| `/system-design/fundamentals/websockets`, `server-sent-events`, `long-polling`, `ajax-polling`, `choosing-realtime`, `push-notifications` | `networking/realtime-on-the-cloud` |
| `/system-design/fundamentals/webhooks` | `networking/webhooks-on-the-cloud` |
| `/system-design/fundamentals/availability`, `capacity-planning`, `scaling-journey` | `resilience/availability-math`, `compute/autoscaling` |
| `/system-design/fundamentals/storage-types` | `data/storage-types` |
| `/system-design/fundamentals/encryption-and-hashing`, `security`, `common-attacks`, `abuse-protection` | `resilience/encryption-and-keys`, `zero-trust`, `threat-detection` |
| `/system-design/patterns/*` (caching, queues, circuit breaker, rate limiting, …) | `data/managed-caches`, `data/streaming-and-messaging-services`, `resilience/quotas-and-retries` |
| `/system-design/databases/*` | `data/managed-relational`, `data/managed-nosql`, `start-here/databases-per-cloud` |

### Page list changes in the Networking & APIs hub

| Brief | Now |
|---|---|
| (review addition) `networking/how-a-request-travels` | **Dropped.** Link to `/system-design/fundamentals/anatomy-of-a-request`. |
| `rest-and-graphql` — REST & GraphQL | `hosting-apis` — "Hosting REST and GraphQL APIs": where an API runs and what sits in front of it on each cloud (gateway vs load balancer, managed GraphQL, auth, throttling, custom domains, cold paths). |
| `grpc` — gRPC & Service-to-Service Calls | `service-to-service` — "Service-to-Service Calls on the Cloud": gRPC and HTTP/2 through managed load balancers, service discovery and private DNS, service mesh, mTLS, workload identity between services. |
| `realtime-protocols` — WebSockets, SSE & Polling | `realtime-on-the-cloud` — "Real-Time Connections on the Cloud": managed WebSocket and pub/sub services, idle timeouts on load balancers and CDNs, connection limits, scaling long-lived connections. |
| `webhooks` | `webhooks-on-the-cloud` — "Receiving and Sending Webhooks on the Cloud": gateway → queue → worker, signature secrets in a secret store, retries and dead-letter queues, managed event destinations. |

The diagram ids for these four keep the brief's names (`rest-vs-graphql` becomes `api-hosting-paths`; `grpc-call`,
`realtime-transports`, `managed-websockets`, `webhook-receiver` stay).

Start here: the generated glossary page is dropped (use `/system-design/glossary`). The three practice pages stay.
`start-here/cloud-basics` is **kept untouched until** `fundamentals/what-is-cloud`, `regions-zones-edge`,
`shared-responsibility` and `service-models` are written; its removal and redirect happen in that wave, not in Wave 0.

## 4. Wave 1 scope (replaces README §7)

**1a – rendering**
- New drawn glyphs in `src/components/diagrams/glyphs.tsx` (same style, tone-aware; add each to the table in
  `content/system-design/COMPONENTS.md` §4): `firewall, router, nat, tunnel, building, webhook, image, container, pod,
  node, function, controller, folder-share, appliance, proxy, partition, topic, snapshot, vault, certificate, radar,
  signal, trace, flag, meter, coin, model, policy, pipeline`.
- `cloud="aws|gcp|azure"` prop on `<AnimatedDiagram>`: the Services toggle starts on that provider (provider pages
  embed concept specs this way). Document it in COMPONENTS.md §3 (the doc's examples are compiled by a unit test).

**1b – data**
- `ResponsibilityGrid`: sets keyed by name with their own layer lists. Add `shared-responsibility`, `gcp-compute`,
  `azure-compute`, `kubernetes`, `network-security`, `object-storage`, `databases`, `ha-controls`,
  `encryption-controls`, `patching`. Keep `aws-compute` rendering exactly as today.
- `DECISION_TREES`: add `database`, `storage`, `connectivity`, `load-balancer`, `dr-strategy` (per-provider answers).
- `CloudService.concept?: string` (site path of the concept page) and a "Learn the idea" link in
  `<CloudServiceProfile>`; fill it for services whose concept page is in the catalogue.
- About 40 catalog entries listed in README §7 (migration/transfer, governance/cost, security, lake governance), each
  with our own `tagline/useWhen/avoidWhen/gotchas`, official `docs` URL, and capability rows where they fit.
- Spec lint or content-check: every `cloud:` catalog id on a spec node exists in `SERVICE_BY_ID`.

## 5. Other rules that changed

- **Access:** never set `access` on a page. Whether the Fundamentals hub is free is the owner's decision in
  `content/sections.yaml`; it stays as it is until the owner says so.
- **Asset group:** all concept specs live in `assets/diagrams/animated/cloud/`. Every spec must pass `lintSpec`
  (`npm test` lints every spec file).
- **Concurrency:** at most 5–8 agents at once; each batch commits before the next starts.
- **Generated files** (`src/components/diagrams/animated-specs.ts`, `src/generated/*`): check how `development`
  treats them (`git ls-files`); follow that.
- **Question bank:** cloud pages map in `content/question-bank/articles.yaml` to `cloud-architecture/<subsection>`;
  subsections become `start-here, fundamentals, networking, compute, data, resilience, operations, aws, gcp, azure,
  scenarios`.
