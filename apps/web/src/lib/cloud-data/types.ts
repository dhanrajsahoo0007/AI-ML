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
