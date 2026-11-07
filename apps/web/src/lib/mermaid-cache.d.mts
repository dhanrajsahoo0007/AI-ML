export declare const CACHE_DIR: string;
export declare function diagramHash(chart: string): string;
export declare function cachePath(hash: string): string;
export declare function readDiagram(hash: string): { light: string; dark: string } | null;
export declare function writeDiagram(hash: string, entry: { light: string; dark: string }): void;
export declare function ensureBuildCache(): string;
