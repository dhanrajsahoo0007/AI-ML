// Shared types for the cloud catalog. Data lives in one file per service group next to this one.

export type ProviderId = "aws" | "gcp" | "azure";

export type GroupId =
  | "compute"
  | "containers"
  | "serverless"
  | "networking"
  | "edge"
  | "storage"
  | "databases"
  | "caching"
  | "messaging"
  | "analytics"
  | "security"
  | "observability"
  | "devops"
  | "ai-ml";

export interface CloudService {
  /** `<provider>-<slug>`, for example "aws-fargate". */
  id: string;
  provider: ProviderId;
  name: string;
  /** Name used in tables and chips, for example "Fargate". */
  short: string;
  group: GroupId;
  tagline: string;
  /** What is still your job once you use this service. */
  youManage: string;
  scaling: string;
  pricing: string;
  useWhen: string[];
  avoidWhen: string[];
  /** Limits and surprises that change a design. */
  gotchas: string[];
  docs: string;
  /** Short status note, for example a service closed to new customers. */
  status?: string;
  /** Capability id that best describes the service's main job, when it appears in several. */
  main?: string;
  /**
   * Site path of the concept page that teaches the idea behind the service, for example
   * "/cloud/compute/kubernetes-concepts". When unset, the group's default in cloud-catalog.ts applies.
   */
  concept?: string;
}

/** How well a cloud covers a capability. */
export type Fit = "direct" | "close" | "partial" | "none";

export interface ProviderAnswer {
  /** Service ids from SERVICES (rendered with a profile link) or plain names. */
  services: string[];
  fit: Fit;
  note?: string;
}

export interface Capability {
  id: string;
  group: GroupId;
  title: string;
  summary: string;
  aws: ProviderAnswer;
  gcp: ProviderAnswer;
  azure: ProviderAnswer;
}

// ---------------------------------------------------------------------------------------------------------------
// Who manages what
// ---------------------------------------------------------------------------------------------------------------

export type Owner = "you" | "shared" | "provider";

export interface ResponsibilityLayer {
  id: string;
  label: string;
}

export interface ResponsibilityOption {
  id: string;
  label: string;
  sub: string;
  /** One owner per layer id of the set this option belongs to. */
  owners: Record<string, Owner>;
}

/** One grid: options as columns (most of the work is yours on the left), layers as rows. */
export interface ResponsibilitySet {
  /** Small heading above the grid. */
  title: string;
  /** Accessible name of the table. */
  ariaLabel: string;
  /** One line under the grid: what to take away. */
  caption: string;
  layers: ResponsibilityLayer[];
  options: ResponsibilityOption[];
}

// ---------------------------------------------------------------------------------------------------------------
// Decision trees
// ---------------------------------------------------------------------------------------------------------------

export interface TreeOption {
  label: string;
  hint?: string;
  next: string;
}

export interface TreeQuestion {
  id: string;
  prompt: string;
  options: TreeOption[];
}

export interface TreeResult {
  id: string;
  headline: string;
  /** Services or plain names per cloud. */
  answer: Record<ProviderId, string[]>;
  why: string;
  tradeoff: string;
}

export interface DecisionTree {
  title: string;
  start: string;
  questions: TreeQuestion[];
  results: TreeResult[];
}
