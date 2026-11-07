/** A section key from content/sections.yaml (validated by src/features/sections/registry.ts). */
export type ContentSection = string;

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
  /** @deprecated unused; dropped from the frontmatter schema (plan §5.3). */
  area?: string;
  order?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
