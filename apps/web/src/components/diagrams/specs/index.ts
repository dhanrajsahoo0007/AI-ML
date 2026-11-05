import type { DiagramSpec } from "../types";
import { messengerArchitecture } from "./messenger/architecture";
import { uberEatsArchitecture } from "./uber-eats/architecture";
import { polyglotEcommerce } from "./databases/polyglot-ecommerce";
import { readScaling } from "./databases/read-scaling";
import { lsmWritePath } from "./databases/lsm-write-path";
import { btreeLookup } from "./databases/btree-lookup";
import { invertedIndex } from "./databases/inverted-index";
import { cdcToSearch } from "./databases/cdc-to-search";

// Diagrams referenced from MDX as <AnimatedDiagram name="..." />.
export const DIAGRAMS: Record<string, DiagramSpec> = {
  "messenger/architecture": messengerArchitecture,
  "uber-eats/architecture": uberEatsArchitecture,
  "databases/polyglot-ecommerce": polyglotEcommerce,
  "databases/read-scaling": readScaling,
  "databases/lsm-write-path": lsmWritePath,
  "databases/btree-lookup": btreeLookup,
  "databases/inverted-index": invertedIndex,
  "databases/cdc-to-search": cdcToSearch,
};
