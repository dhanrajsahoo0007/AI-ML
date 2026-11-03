export type ContentSection =
  | "interviews"
  | "system-design"
  | "ai-system-design"
  | "ml-system-design"
  | "companies";

export interface ContentGroupDef {
  name: string;
  icon?: string;
  categories: string[];
}

export interface ContentMeta {
  slug: string;
  title: string;
  description?: string;
  icon?: string;
  categories?: string[];
  groups?: ContentGroupDef[];
  area?: string;
  order?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
