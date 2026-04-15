export type ContentSection = "learning-paths" | "interviews" | "system-design";

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
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
