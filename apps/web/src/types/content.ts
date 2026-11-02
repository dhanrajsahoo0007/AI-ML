export type ContentSection =
  | "learning-paths"
  | "interviews"
  | "system-design"
  | "ai-system-design"
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
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
