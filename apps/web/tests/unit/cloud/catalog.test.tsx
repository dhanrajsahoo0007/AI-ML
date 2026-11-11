import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CloudServiceProfile } from "@/components/cloud/cloud-service-profile";
import {
  CAPABILITIES,
  GROUP_BY_ID,
  SERVICES,
  SERVICE_BY_ID,
  capabilitiesOfService,
  type ProviderId,
} from "@/lib/cloud-catalog";

// Integrity of the cloud catalog: ids, vendor documentation links, concept links and capability rows.

const PROVIDERS: ProviderId[] = ["aws", "gcp", "azure"];
const looksLikeId = (s: string) => /^(aws|gcp|azure)-[a-z0-9-]+$/.test(s);

/** Documentation must live on the vendor's own site. */
const DOCS_HOSTS: Record<ProviderId, string[]> = {
  aws: ["docs.aws.amazon.com", "aws.amazon.com"],
  gcp: ["cloud.google.com", "docs.cloud.google.com"],
  azure: ["learn.microsoft.com", "azure.microsoft.com"],
};

// The concept pages of the six hubs (content/cloud/_plan/01–06 with the slug changes in RECONCILIATION.md §3).
// A service's `concept` must be one of these; update this list in the same change that adds or renames a page.
const HUB_PAGES: Record<string, string[]> = {
  fundamentals: [
    "what-is-cloud",
    "service-models",
    "regions-zones-edge",
    "shared-responsibility",
    "identity-and-access",
    "accounts-and-governance",
    "landing-zones",
    "pricing-basics",
    "well-architected-thinking",
    "infrastructure-as-code",
  ],
  networking: [
    "vpc-and-subnets",
    "firewalls",
    "nat-and-egress",
    "private-endpoints",
    "connecting-networks",
    "hybrid-connectivity",
    "dns",
    "load-balancing",
    "cdn-edge-and-waf",
    "hosting-apis",
    "service-to-service",
    "realtime-on-the-cloud",
    "webhooks-on-the-cloud",
    "api-gateways",
  ],
  compute: [
    "compute-spectrum",
    "virtual-machines",
    "autoscaling",
    "containers-and-registries",
    "kubernetes-concepts",
    "serverless-functions",
    "serverless-containers-and-paas",
    "batch-hpc-gpus",
  ],
  data: [
    "data-on-the-cloud",
    "storage-types",
    "object-storage",
    "block-storage",
    "file-hybrid-and-transfer",
    "managed-relational",
    "managed-nosql",
    "managed-caches",
    "warehouses-lakes-and-query-engines",
    "streaming-and-messaging-services",
    "database-migration",
  ],
  resilience: [
    "availability-math",
    "ha-patterns",
    "dr-strategies",
    "backups-and-vaults",
    "multi-region",
    "quotas-and-retries",
    "encryption-and-keys",
    "secrets-management",
    "zero-trust",
    "threat-detection",
    "compliance-and-residency",
    "ai-security",
  ],
  operations: [
    "observability-on-the-cloud",
    "slos-alerting-and-on-call",
    "ci-cd-and-deployment-strategies",
    "config-patching-and-fleet-management",
    "cloud-cost-models",
    "finops-and-cost-tools",
    "migration-and-modernization",
    "ai-ml-platforms-on-the-cloud",
  ],
};
const CONCEPT_PAGES = new Set(
  Object.entries(HUB_PAGES).flatMap(([hub, pages]) => pages.map((page) => `/cloud/${hub}/${page}`))
);

// Entries added with the cloud curriculum (Wave 1b). They are held to the full profile standard below.
const WAVE_1B = [
  ...["aws-datasync", "aws-storage-gateway", "aws-snow-family", "aws-transfer-family", "aws-dms", "aws-sct"],
  ...["aws-migration-hub", "aws-organizations", "aws-control-tower", "aws-cost-explorer", "aws-budgets"],
  ...["aws-compute-optimizer", "aws-guardduty", "aws-inspector", "aws-macie", "aws-backup"],
  ...["aws-elastic-disaster-recovery", "aws-verified-access", "aws-lake-formation"],
  ...["gcp-storage-transfer", "gcp-transfer-appliance", "gcp-database-migration-service", "gcp-migration-center"],
  ...["gcp-resource-manager", "gcp-cloud-billing", "gcp-iap", "gcp-vpc-service-controls"],
  ...["gcp-sensitive-data-protection", "gcp-model-armor", "gcp-dataplex", "gcp-backup-dr"],
  ...["azure-data-box", "azure-file-sync", "azure-migrate", "azure-dms", "azure-management-groups"],
  ...["azure-policy", "azure-cost-management", "azure-advisor", "azure-site-recovery", "azure-backup"],
  "azure-purview",
];

describe("cloud catalog: services", () => {
  it("has unique ids that start with their provider", () => {
    const ids = SERVICES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SERVICES) {
      expect(s.id, s.id).toMatch(/^(aws|gcp|azure)-[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(s.id.startsWith(`${s.provider}-`), s.id).toBe(true);
      expect(GROUP_BY_ID[s.group], s.id).toBeDefined();
    }
  });

  it("fills every text field", () => {
    for (const s of SERVICES) {
      for (const field of [s.name, s.short, s.tagline, s.youManage, s.scaling, s.pricing]) {
        expect(field.trim(), s.id).not.toBe("");
      }
      for (const line of [...s.useWhen, ...s.avoidWhen, ...s.gotchas]) expect(line.trim(), s.id).not.toBe("");
      expect(s.useWhen.length, s.id).toBeGreaterThan(0);
    }
  });

  it("links documentation over https on the vendor's own domain", () => {
    for (const s of SERVICES) {
      const url = new URL(s.docs);
      expect(url.protocol, s.id).toBe("https:");
      expect(DOCS_HOSTS[s.provider], `${s.id}: ${s.docs}`).toContain(url.hostname);
    }
  });

  it("points `main` at a capability that lists the service", () => {
    for (const s of SERVICES) {
      if (!s.main) continue;
      const capability = CAPABILITIES.find((c) => c.id === s.main);
      expect(capability, `${s.id}: main "${s.main}"`).toBeDefined();
      expect(capability![s.provider].services, `${s.id}: main "${s.main}"`).toContain(s.id);
      expect(capabilitiesOfService(s.id)[0].id, s.id).toBe(s.main);
    }
  });

  it("includes every Wave 1b entry, written to the full profile standard", () => {
    expect(new Set(WAVE_1B).size).toBe(WAVE_1B.length);
    for (const id of WAVE_1B) {
      const s = SERVICE_BY_ID[id];
      expect(s, id).toBeDefined();
      expect(s.useWhen.length, id).toBeGreaterThanOrEqual(2);
      expect(s.useWhen.length, id).toBeLessThanOrEqual(4);
      expect(s.avoidWhen.length, id).toBeGreaterThanOrEqual(1);
      expect(s.avoidWhen.length, id).toBeLessThanOrEqual(3);
      expect(s.gotchas.length, id).toBeGreaterThanOrEqual(1);
      expect(s.gotchas.length, id).toBeLessThanOrEqual(3);
      // Pricing is described as a shape (what you pay per), never as a number that goes stale.
      expect(s.pricing, id).not.toMatch(/[0-9$€£%]/);
      expect(s.concept, id).toBeDefined();
      // Each one shows up in a group table and in the equivalence matrix.
      expect(capabilitiesOfService(id).length, id).toBeGreaterThan(0);
      expect(s.main, id).toBeDefined();
    }
  });
});

describe("cloud catalog: concept links", () => {
  it("only link to concept pages that are in the curriculum", () => {
    for (const s of SERVICES) {
      if (s.concept === undefined) continue;
      expect(s.concept.startsWith("/cloud/"), s.id).toBe(true);
      expect(CONCEPT_PAGES, `${s.id}: ${s.concept}`).toContain(s.concept);
    }
  });

  it("are set for every service that has a matching page", () => {
    // Search engines are the one family without a concept page of their own.
    const without = SERVICES.filter((s) => s.concept === undefined).map((s) => s.id);
    expect(without.sort()).toEqual(["aws-opensearch", "azure-ai-search"]);
  });

  it("send each family to the page that teaches it", () => {
    const expected: Record<string, string> = {
      "aws-ec2": "/cloud/compute/virtual-machines",
      "aws-eks": "/cloud/compute/kubernetes-concepts",
      "gcp-gke": "/cloud/compute/kubernetes-concepts",
      "azure-aks": "/cloud/compute/kubernetes-concepts",
      "aws-ecr": "/cloud/compute/containers-and-registries",
      "gcp-cloud-run": "/cloud/compute/serverless-containers-and-paas",
      "aws-lambda": "/cloud/compute/serverless-functions",
      "aws-api-gateway": "/cloud/networking/api-gateways",
      "aws-step-functions": "/cloud/data/streaming-and-messaging-services",
      "azure-event-grid": "/cloud/data/streaming-and-messaging-services",
      "gcp-vpc": "/cloud/networking/vpc-and-subnets",
      "aws-elb": "/cloud/networking/load-balancing",
      "azure-private-link": "/cloud/networking/private-endpoints",
      "aws-transit-gateway": "/cloud/networking/connecting-networks",
      "gcp-interconnect": "/cloud/networking/hybrid-connectivity",
      "aws-route53": "/cloud/networking/dns",
      "aws-cloudfront": "/cloud/networking/cdn-edge-and-waf",
      "aws-s3": "/cloud/data/object-storage",
      "aws-ebs": "/cloud/data/block-storage",
      "azure-files": "/cloud/data/file-hybrid-and-transfer",
      "gcp-cloud-sql": "/cloud/data/managed-relational",
      "aws-dynamodb": "/cloud/data/managed-nosql",
      "gcp-memorystore": "/cloud/data/managed-caches",
      "aws-sqs": "/cloud/data/streaming-and-messaging-services",
      "gcp-bigquery": "/cloud/data/warehouses-lakes-and-query-engines",
      "aws-iam": "/cloud/fundamentals/identity-and-access",
      "aws-kms": "/cloud/resilience/encryption-and-keys",
      "gcp-secret-manager": "/cloud/resilience/secrets-management",
      "azure-defender": "/cloud/resilience/threat-detection",
      "azure-waf": "/cloud/networking/cdn-edge-and-waf",
      "aws-cloudwatch": "/cloud/operations/observability-on-the-cloud",
      "aws-codepipeline": "/cloud/operations/ci-cd-and-deployment-strategies",
      "azure-bicep": "/cloud/fundamentals/infrastructure-as-code",
      "aws-bedrock": "/cloud/operations/ai-ml-platforms-on-the-cloud",
    };
    for (const [id, concept] of Object.entries(expected)) expect(SERVICE_BY_ID[id].concept, id).toBe(concept);
  });
});

describe("cloud catalog: capabilities", () => {
  it("has unique ids in known groups", () => {
    const ids = CAPABILITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CAPABILITIES) {
      expect(GROUP_BY_ID[c.group], c.id).toBeDefined();
      expect(c.title.trim(), c.id).not.toBe("");
      expect(c.summary.trim(), c.id).not.toBe("");
    }
  });

  it("names real services under the right cloud", () => {
    for (const c of CAPABILITIES) {
      for (const provider of PROVIDERS) {
        for (const name of c[provider].services) {
          if (!looksLikeId(name)) continue;
          expect(SERVICE_BY_ID[name], `${c.id}/${provider}: ${name}`).toBeDefined();
          expect(SERVICE_BY_ID[name].provider, `${c.id}/${provider}: ${name}`).toBe(provider);
        }
      }
    }
  });

  it('says "none" exactly when a cloud has nothing to list, and explains it', () => {
    for (const c of CAPABILITIES) {
      for (const provider of PROVIDERS) {
        const answer = c[provider];
        expect(answer.fit === "none", `${c.id}/${provider}`).toBe(answer.services.length === 0);
        if (answer.fit === "none") expect(answer.note, `${c.id}/${provider}`).toBeTruthy();
      }
    }
  });
});

describe("<CloudServiceProfile>", () => {
  it("links to the concept page next to the vendor docs", () => {
    const html = renderToStaticMarkup(createElement(CloudServiceProfile, { id: "aws-eks" }));
    expect(html).toMatch(/<a[^>]*href="\/cloud\/compute\/kubernetes-concepts"[^>]*>Learn the idea/);
    expect(html).toMatch(/<a[^>]*href="https:\/\/aws\.amazon\.com\/eks\/"[^>]*>Docs/);
    // The concept link stays on the site; only the vendor link opens a new tab.
    expect(html.match(/target="_blank"/g)).toHaveLength(1);
  });

  it("shows no concept link when the service has none", () => {
    const html = renderToStaticMarkup(createElement(CloudServiceProfile, { id: "aws-opensearch" }));
    expect(html).not.toContain("Learn the idea");
    expect(html).toContain("Docs");
  });

  it("shows the status note of a service that is closed to new customers", () => {
    const html = renderToStaticMarkup(createElement(CloudServiceProfile, { id: "aws-migration-hub" }));
    expect(html).toContain("Closed to new customers");
  });

  it.each(WAVE_1B)("renders %s with its equivalents on the other clouds", (id) => {
    const html = renderToStaticMarkup(createElement(CloudServiceProfile, { id }));
    expect(html).not.toContain("Unknown cloud service");
    expect(html).toContain("Elsewhere");
    expect(html).toContain("Learn the idea");
  });
});
